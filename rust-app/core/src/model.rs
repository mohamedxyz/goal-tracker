//! Item shapes. Field names match the backup JSON written by the web app.
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

fn is_false(b: &bool) -> bool {
    !*b
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct ChecklistItem {
    #[serde(default)]
    pub text: String,
    #[serde(default)]
    pub done: bool,
    /// Game damage frozen when the item was ticked, and when (ms).
    #[serde(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dmg: Option<f64>,
    #[serde(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub at: Option<i64>,
    /// Fields this version does not know about, kept so nothing is lost on save.
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct FocusLog {
    pub at: i64,
    #[serde(default)]
    pub m: f64,
    /// Fields this version does not know about, kept so nothing is lost on save.
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct Task {
    pub id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub repeat: String,
    #[serde(default)]
    pub tag: String,
    #[serde(default)]
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub items: Vec<ChecklistItem>,
    #[serde(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub due: Option<String>,
    #[serde(default)]
    pub priority: String,
    #[serde(default, rename = "goalId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub goal_id: Option<String>,
    #[serde(default)]
    pub done: bool,
    #[serde(default)]
    pub created: i64,
    #[serde(default, rename = "doneAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub done_at: Option<i64>,
    #[serde(default)]
    #[serde(skip_serializing_if = "is_false")]
    pub archived: bool,
    #[serde(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub focus: Option<f64>,
    #[serde(default, rename = "focusLog")]
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub focus_log: Vec<FocusLog>,
    /// Each entry is a push-back; only the count matters for damage.
    #[serde(default)]
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub pushes: Vec<serde_json::Value>,
    /// Damage frozen at completion (game mode).
    #[serde(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dmg: Option<f64>,
    #[serde(default)]
    #[serde(skip_serializing_if = "is_false")]
    pub crit: bool,
    /// Fields this version does not know about, kept so nothing is lost on save.
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct Goal {
    pub id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub horizon: String,
    #[serde(default)]
    pub period: String,
    #[serde(default, rename = "parentId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    #[serde(default)]
    pub notes: String,
    /// "check" | "number" | "rollup" | absent
    #[serde(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kind: Option<String>,
    #[serde(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target: Option<f64>,
    #[serde(default)]
    pub unit: String,
    #[serde(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<f64>,
    #[serde(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expected: Option<f64>,
    #[serde(default)]
    pub done: bool,
    #[serde(default)]
    pub created: i64,
    #[serde(default, rename = "autoDone")]
    #[serde(skip_serializing_if = "is_false")]
    pub auto_done: bool,
    #[serde(default, rename = "manualOpen")]
    #[serde(skip_serializing_if = "is_false")]
    pub manual_open: bool,
    #[serde(default, rename = "doneAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub done_at: Option<i64>,
    #[serde(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    /// Fields this version does not know about, kept so nothing is lost on save.
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct Habit {
    pub id: String,
    #[serde(default)]
    pub name: String,
    /// "" | "avoid"
    #[serde(default)]
    pub kind: String,
    /// "" | "confirm"
    #[serde(default)]
    pub mode: String,
    #[serde(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target: Option<u32>,
    #[serde(default)]
    pub group: String,
    /// 0 = Sunday .. 6 = Saturday; empty or all seven = every day
    #[serde(default)]
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub days: Vec<u32>,
    #[serde(default)]
    pub created: i64,
    /// Fields this version does not know about, kept so nothing is lost on save.
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct LogEntry {
    pub id: String,
    #[serde(default, rename = "habitId")]
    pub habit_id: String,
    #[serde(default)]
    pub date: String,
    /// Fields this version does not know about, kept so nothing is lost on save.
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct Session {
    pub d: String,
    #[serde(default)]
    pub c: u32,
    /// Fields this version does not know about, kept so nothing is lost on save.
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct Topic {
    pub id: String,
    #[serde(default)]
    pub subject: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub sessions: Vec<Session>,
    #[serde(default)]
    pub created: i64,
    /// Fields this version does not know about, kept so nothing is lost on save.
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct Exam {
    pub id: String,
    #[serde(default)]
    pub kind: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub subject: String,
    #[serde(default)]
    pub date: String,
    #[serde(default)]
    pub time: String,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub score: Option<f64>,
    #[serde(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max: Option<f64>,
    #[serde(default)]
    pub created: i64,
    /// Fields this version does not know about, kept so nothing is lost on save.
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

/// Trash record. `data` stays raw JSON so every kind round-trips untouched.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TrashRec {
    pub id: String,
    #[serde(default)]
    pub at: i64,
    pub data: serde_json::Value,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub logs: Option<serde_json::Value>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

/// The settings the logic reads (subset of the web app's `cfg`).
#[derive(Debug, Clone, Default, PartialEq)]
pub struct Cfg {
    pub student: bool,
    pub rpg: bool,
    /// `YYYY-MM-DD` the game was switched on, or empty
    pub rpg_since: String,
    /// Tasks per day for Blaze / Titan (0 = default 3 / 5)
    pub lvl2: f64,
    pub lvl3: f64,
    /// Pass mark (%) for exam elites (0 = default 60)
    pub elite_target: f64,
}

/// All app data held in memory (the Rust twin of the JS `S` object).
#[derive(Debug, Clone, Default)]
pub struct State {
    pub tasks: Vec<Task>,
    pub goals: Vec<Goal>,
    pub habits: Vec<Habit>,
    pub topics: Vec<Topic>,
    pub exams: Vec<Exam>,
    pub trash: Vec<TrashRec>,
    /// keys are `"habitId|YYYY-MM-DD"`
    pub logs: std::collections::HashSet<String>,
    /// comma-separated `YYYY-MM-DD` rest days (cfg.restDays)
    pub rest_days: std::collections::HashSet<String>,
    pub cfg: Cfg,
}
