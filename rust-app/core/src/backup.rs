//! Backup JSON (`{app:'goal-tracker', version:1, ...}`), see `92-reports-search-share-backup.js:247`.
use crate::model::*;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Backup {
    pub app: String,
    #[serde(default)]
    pub version: u32,
    #[serde(default, rename = "appVersion")]
    pub app_version: String,
    #[serde(default)]
    pub exported: Value,
    #[serde(default)]
    pub tasks: Vec<Task>,
    #[serde(default)]
    pub goals: Vec<Goal>,
    #[serde(default)]
    pub habits: Vec<Habit>,
    #[serde(default)]
    pub topics: Vec<Topic>,
    #[serde(default)]
    pub exams: Vec<Exam>,
    #[serde(default)]
    pub trash: Vec<TrashRec>,
    #[serde(default)]
    pub logs: Vec<LogEntry>,
    /// `{cfg, sound, hideDone, compact}`; kept raw until the settings port.
    #[serde(default)]
    pub settings: HashMap<String, Value>,
}

#[derive(Debug)]
pub enum BackupError {
    Json(serde_json::Error),
    NotGoalTerra,
}

impl std::fmt::Display for BackupError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BackupError::Json(e) => write!(f, "invalid backup file: {e}"),
            BackupError::NotGoalTerra => write!(f, "not a GoalTerra backup"),
        }
    }
}
impl std::error::Error for BackupError {}

pub fn parse(text: &str) -> Result<Backup, BackupError> {
    let b: Backup = serde_json::from_str(text).map_err(BackupError::Json)?;
    if b.app != "goal-tracker" {
        return Err(BackupError::NotGoalTerra);
    }
    Ok(b)
}

/// JS-style number: numbers and numeric strings; anything else is 0.
fn num(v: Option<&Value>) -> f64 {
    match v {
        Some(Value::Number(n)) => n.as_f64().unwrap_or(0.0),
        Some(Value::String(s)) => s.trim().parse().unwrap_or(0.0),
        _ => 0.0,
    }
}

pub fn cfg_of(cfg: Option<&Value>) -> Cfg {
    let g = |k: &str| cfg.and_then(|c| c.get(k));
    let truthy = |k: &str| match g(k) {
        Some(Value::Bool(b)) => *b,
        Some(Value::Number(n)) => n.as_f64().map(|x| x != 0.0).unwrap_or(false),
        Some(Value::String(s)) => !s.is_empty(),
        _ => false,
    };
    Cfg {
        student: truthy("student"),
        rpg: truthy("rpg"),
        rpg_since: g("rpgSince")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        lvl2: num(g("lvl2")),
        lvl3: num(g("lvl3")),
        elite_target: num(g("eliteTarget")),
    }
}

impl Backup {
    pub fn into_state(self) -> State {
        let cfg = cfg_of(self.settings.get("cfg"));
        State {
            cfg,
            tasks: self.tasks,
            goals: self.goals,
            habits: self.habits,
            topics: self.topics,
            exams: self.exams,
            trash: self.trash,
            logs: self.logs.into_iter().map(|l| l.id).collect(),
            rest_days: self
                .settings
                .get("cfg")
                .and_then(|c| c.get("restDays"))
                .and_then(|v| v.as_str())
                .map(|s| {
                    s.split(',')
                        .filter(|x| !x.is_empty())
                        .map(String::from)
                        .collect()
                })
                .unwrap_or_default(),
        }
    }
}
