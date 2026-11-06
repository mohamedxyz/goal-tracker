use goalterra_core::{backup, model::*, store::*};
use serde_json::{json, Value};

const BACKUP: &str = r#"{"app":"goal-tracker","version":1,"appVersion":"0.75.0","exported":"2026-11-06T10:00:00Z",
 "tasks":[{"id":"a","title":"T","due":"2026-11-07","futureField":{"x":[1,2]},"items":[{"text":"i","done":true,"weird":1}]}],
 "goals":[{"id":"g","title":"G","horizon":"weekly","period":"2026-W45","somethingNew":true}],
 "habits":[{"id":"h","name":"H","days":[1,3]}],"topics":[{"id":"tp","subject":"S","sessions":[{"d":"2026-11-01","c":2,"note":"n"}]}],
 "exams":[{"id":"e","title":"E","date":"2026-12-01","score":5.5}],
 "trash":[{"id":"x","at":4102444800000,"data":{"id":"z","title":"Gone"},"kind":"task"},{"id":"old","at":1,"data":{"id":"o"}}],
 "logs":[{"id":"h|2026-11-01","habitId":"h","date":"2026-11-01"}],
 "settings":{"cfg":{"lang":"ar","student":true,"restDays":"2026-11-02","unknownCfg":[1]},"sound":"1","hideDone":true}}"#;

/// Every value in `a` must appear unchanged in `b` (b may add defaults).
fn subset(a: &Value, b: &Value) -> bool {
    match (a, b) {
        (Value::Object(x), Value::Object(y)) => x
            .iter()
            .all(|(k, v)| y.get(k).map(|w| subset(v, w)).unwrap_or(false)),
        (Value::Array(x), Value::Array(y)) => {
            x.len() == y.len() && x.iter().zip(y).all(|(p, q)| subset(p, q))
        }
        _ => a == b,
    }
}
fn has_null(v: &Value) -> bool {
    match v {
        Value::Null => true,
        Value::Object(m) => m.values().any(has_null),
        Value::Array(a) => a.iter().any(has_null),
        _ => false,
    }
}

#[test]
fn restore_export_is_lossless() {
    let b = backup::parse(BACKUP).unwrap();
    let mut s = Store::open_memory().unwrap();
    s.restore(&b).unwrap();
    let out = s.export("0.75.0", json!("2026-11-06T10:00:00Z")).unwrap();
    // compare as JSON values so unknown fields must survive
    let a: Value = serde_json::from_str(BACKUP).unwrap();
    let z: Value = serde_json::to_value(&out).unwrap();
    for k in [
        "tasks", "goals", "habits", "topics", "exams", "logs", "settings", "trash",
    ] {
        assert!(
            subset(&a[k], &z[k]),
            "{k}: lost data\n in:  {}\n out: {}",
            a[k],
            z[k]
        );
        assert!(!has_null(&z[k]), "{k}: export contains null: {}", z[k]);
    }
}

#[test]
fn load_state_and_trash_expiry() {
    let b = backup::parse(BACKUP).unwrap();
    let mut s = Store::open_memory().unwrap();
    s.restore(&b).unwrap();
    let st = s.load(1_800_000_000_000).unwrap();
    assert_eq!(st.tasks.len(), 1);
    assert!(st.logs.contains("h|2026-11-01"));
    assert!(st.rest_days.contains("2026-11-02"));
    assert!(st.cfg.student);
    assert_eq!(st.trash.len(), 1, "old trash dropped");
    assert_eq!(st.trash[0].id, "x");
    // dropped row is gone from the DB too
    assert_eq!(s.export("v", Value::Null).unwrap().trash.len(), 1);
}

#[test]
fn put_del_log_persist_on_disk() {
    let dir = std::env::temp_dir().join(format!("gt-store-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let path = dir.join("t.db");
    {
        let s = Store::open(&path).unwrap();
        s.put(
            "tasks",
            "t1",
            &Task {
                id: "t1".into(),
                title: "hello".into(),
                ..Default::default()
            },
        )
        .unwrap();
        s.log_set("h", "2026-11-05", true).unwrap();
        s.log_set("h", "2026-11-06", true).unwrap();
        s.log_set("h", "2026-11-06", false).unwrap();
    }
    let s = Store::open(&path).unwrap();
    let st = s.load(0).unwrap();
    assert_eq!(st.tasks[0].title, "hello");
    assert_eq!(st.logs.len(), 1);
    assert!(st.logs.contains("h|2026-11-05"));
    s.clear("tasks").unwrap();
    assert!(s.load(0).unwrap().tasks.is_empty());
    std::fs::remove_dir_all(dir).ok();
}

#[test]
fn restore_rolls_back_on_failure() {
    let dir = std::env::temp_dir().join(format!("gt-rollback-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let path = dir.join("r.db");
    let mut s = Store::open(&path).unwrap();
    s.restore(&backup::parse(BACKUP).unwrap()).unwrap();
    s.put(
        "tasks",
        "keep",
        &Task {
            id: "keep".into(),
            ..Default::default()
        },
    )
    .unwrap();
    // break the DB from outside: the restore fails halfway (after tasks were already wiped)
    rusqlite::Connection::open(&path)
        .unwrap()
        .execute_batch("DROP TABLE goals;")
        .unwrap();
    let mut other = backup::parse(BACKUP).unwrap();
    other.tasks.clear();
    assert!(s.restore(&other).is_err());
    let n: i64 = rusqlite::Connection::open(&path)
        .unwrap()
        .query_row("SELECT COUNT(*) FROM tasks", [], |r| r.get(0))
        .unwrap();
    assert_eq!(
        n, 2,
        "failed restore must roll back: original task and 'keep' remain"
    );
    std::fs::remove_dir_all(dir).ok();
}
