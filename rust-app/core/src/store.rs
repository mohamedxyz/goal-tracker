//! SQLite storage. One table per store holding the item as JSON (lossless), plus a key/value table for settings.
use crate::backup::{cfg_of, Backup};
use crate::model::*;
use rusqlite::{params, Connection, Transaction};
use serde::{de::DeserializeOwned, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::path::Path;

pub const STORES: [&str; 7] = [
    "tasks", "goals", "habits", "logs", "topics", "exams", "trash",
];
pub const TRASH_DAYS: i64 = 30;

#[derive(Debug)]
pub enum StoreError {
    Db(rusqlite::Error),
    Json(serde_json::Error),
}
impl From<rusqlite::Error> for StoreError {
    fn from(e: rusqlite::Error) -> Self {
        StoreError::Db(e)
    }
}
impl From<serde_json::Error> for StoreError {
    fn from(e: serde_json::Error) -> Self {
        StoreError::Json(e)
    }
}
impl std::fmt::Display for StoreError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            StoreError::Db(e) => write!(f, "database error: {e}"),
            StoreError::Json(e) => write!(f, "data error: {e}"),
        }
    }
}
impl std::error::Error for StoreError {}
type R<T> = Result<T, StoreError>;

pub struct Store {
    conn: Connection,
}

fn init(conn: &Connection) -> R<()> {
    for s in STORES {
        conn.execute_batch(&format!(
            "CREATE TABLE IF NOT EXISTS {s} (id TEXT PRIMARY KEY, json TEXT NOT NULL);"
        ))?;
    }
    conn.execute_batch("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);")?;
    Ok(())
}

fn check(store: &str) -> &str {
    assert!(STORES.contains(&store), "unknown store {store}");
    store
}

fn read_all<T: DeserializeOwned>(conn: &Connection, store: &str) -> R<Vec<T>> {
    let mut st = conn.prepare(&format!("SELECT json FROM {} ORDER BY rowid", check(store)))?;
    let rows = st.query_map([], |r| r.get::<_, String>(0))?;
    let mut out = vec![];
    for r in rows {
        out.push(serde_json::from_str(&r?)?);
    }
    Ok(out)
}

fn put_tx<T: Serialize>(tx: &Transaction, store: &str, id: &str, v: &T) -> R<()> {
    tx.execute(
        &format!(
            "INSERT OR REPLACE INTO {} (id, json) VALUES (?1, ?2)",
            check(store)
        ),
        params![id, serde_json::to_string(v)?],
    )?;
    Ok(())
}

impl Store {
    pub fn open(path: &Path) -> R<Self> {
        let conn = Connection::open(path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        init(&conn)?;
        Ok(Store { conn })
    }
    pub fn open_memory() -> R<Self> {
        let conn = Connection::open_in_memory()?;
        init(&conn)?;
        Ok(Store { conn })
    }

    /// Load everything. Trash older than `TRASH_DAYS` (or without data) is deleted, like the web app.
    pub fn load(&self, now_ms: i64) -> R<State> {
        let cut = now_ms - TRASH_DAYS * 86_400_000;
        let trash: Vec<TrashRec> = read_all(&self.conn, "trash")?;
        let (keep, drop): (Vec<_>, Vec<_>) = trash
            .into_iter()
            .partition(|r| !r.data.is_null() && r.at >= cut);
        for r in &drop {
            self.del("trash", &r.id)?;
        }
        let logs: Vec<LogEntry> = read_all(&self.conn, "logs")?;
        let cfg_json = self
            .kv("cfg")?
            .and_then(|s| serde_json::from_str::<Value>(&s).ok());
        Ok(State {
            tasks: read_all(&self.conn, "tasks")?,
            goals: read_all(&self.conn, "goals")?,
            habits: read_all(&self.conn, "habits")?,
            topics: read_all(&self.conn, "topics")?,
            exams: read_all(&self.conn, "exams")?,
            trash: keep,
            logs: logs.into_iter().map(|l| l.id).collect(),
            rest_days: cfg_json
                .as_ref()
                .and_then(|c| c.get("restDays"))
                .and_then(|v| v.as_str())
                .map(|s| {
                    s.split(',')
                        .filter(|x| !x.is_empty())
                        .map(String::from)
                        .collect()
                })
                .unwrap_or_default(),
            cfg: cfg_of(cfg_json.as_ref()),
        })
    }

    pub fn put<T: Serialize>(&self, store: &str, id: &str, v: &T) -> R<()> {
        self.conn.execute(
            &format!(
                "INSERT OR REPLACE INTO {} (id, json) VALUES (?1, ?2)",
                check(store)
            ),
            params![id, serde_json::to_string(v)?],
        )?;
        Ok(())
    }
    pub fn del(&self, store: &str, id: &str) -> R<()> {
        self.conn.execute(
            &format!("DELETE FROM {} WHERE id = ?1", check(store)),
            params![id],
        )?;
        Ok(())
    }
    pub fn clear(&self, store: &str) -> R<()> {
        self.conn
            .execute(&format!("DELETE FROM {}", check(store)), [])?;
        Ok(())
    }
    pub fn log_set(&self, habit_id: &str, date: &str, on: bool) -> R<()> {
        let id = format!("{habit_id}|{date}");
        if on {
            self.put(
                "logs",
                &id,
                &LogEntry {
                    id: id.clone(),
                    habit_id: habit_id.into(),
                    date: date.into(),
                    ..Default::default()
                },
            )
        } else {
            self.del("logs", &id)
        }
    }

    pub fn kv(&self, k: &str) -> R<Option<String>> {
        let mut st = self.conn.prepare("SELECT v FROM kv WHERE k = ?1")?;
        let mut rows = st.query(params![k])?;
        Ok(match rows.next()? {
            Some(r) => Some(r.get(0)?),
            None => None,
        })
    }
    pub fn set_kv(&self, k: &str, v: &str) -> R<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO kv (k, v) VALUES (?1, ?2)",
            params![k, v],
        )?;
        Ok(())
    }

    /// Replace ALL data with a backup in one transaction. On any error nothing changes (rollback).
    pub fn restore(&mut self, b: &Backup) -> R<()> {
        let tx = self.conn.transaction()?;
        for s in STORES {
            tx.execute(&format!("DELETE FROM {s}"), [])?;
        }
        tx.execute("DELETE FROM kv", [])?;
        for t in &b.tasks {
            put_tx(&tx, "tasks", &t.id, t)?;
        }
        for g in &b.goals {
            put_tx(&tx, "goals", &g.id, g)?;
        }
        for h in &b.habits {
            put_tx(&tx, "habits", &h.id, h)?;
        }
        for l in &b.logs {
            put_tx(&tx, "logs", &l.id, l)?;
        }
        for t in &b.topics {
            put_tx(&tx, "topics", &t.id, t)?;
        }
        for e in &b.exams {
            put_tx(&tx, "exams", &e.id, e)?;
        }
        for r in &b.trash {
            put_tx(&tx, "trash", &r.id, r)?;
        }
        for (k, v) in &b.settings {
            tx.execute(
                "INSERT OR REPLACE INTO kv (k, v) VALUES (?1, ?2)",
                params![k, serde_json::to_string(v)?],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn export(&self, app_version: &str, exported: Value) -> R<Backup> {
        let mut settings: HashMap<String, Value> = HashMap::new();
        let mut st = self.conn.prepare("SELECT k, v FROM kv")?;
        let rows = st.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))?;
        for r in rows {
            let (k, v) = r?;
            settings.insert(k, serde_json::from_str(&v)?);
        }
        Ok(Backup {
            app: "goal-tracker".into(),
            version: 1,
            app_version: app_version.into(),
            exported,
            tasks: read_all(&self.conn, "tasks")?,
            goals: read_all(&self.conn, "goals")?,
            habits: read_all(&self.conn, "habits")?,
            topics: read_all(&self.conn, "topics")?,
            exams: read_all(&self.conn, "exams")?,
            trash: read_all(&self.conn, "trash")?,
            logs: read_all(&self.conn, "logs")?,
            settings,
        })
    }
}
