//! Backup JSON (`{app:'goal-tracker', version:1, ...}`), see `92-reports-search-share-backup.js:247`.
use crate::cfg::Cfg;
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

/// Settings object from a backup (`settings.cfg`), with defaults for missing keys.
pub fn cfg_of(cfg: Option<&Value>) -> Cfg {
    Cfg::from_json(cfg)
}

impl Backup {
    pub fn into_state(self) -> State {
        let cfg = cfg_of(self.settings.get("cfg"));
        State {
            cfg,
            mini: self
                .logs
                .iter()
                .filter(|l| l.mini)
                .map(|l| l.id.clone())
                .collect(),
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
