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
    #[serde(
        default,
        rename = "archivedAt",
        skip_serializing_if = "Option::is_none"
    )]
    pub archived_at: Option<i64>,
    /// Repeating tasks: the generated next / previous task.
    #[serde(default, rename = "nextId", skip_serializing_if = "Option::is_none")]
    pub next_id: Option<String>,
    #[serde(default, rename = "prevId", skip_serializing_if = "Option::is_none")]
    pub prev_id: Option<String>,
    /// Start time `HH:MM` (time blocking).
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub start: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub icon: String,
    /// Planned length in minutes (time blocking).
    #[serde(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dur: Option<f64>,
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
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub icon: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub carried: Vec<String>,
    #[serde(
        default,
        rename = "reviewedAt",
        skip_serializing_if = "Option::is_none"
    )]
    pub reviewed_at: Option<i64>,
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
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub icon: String,
    /// Habit craft: identity, stack anchor (habit id), time, place, treat, two-minute version.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub ident: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub after: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub at: String,
    #[serde(default, rename = "where", skip_serializing_if = "String::is_empty")]
    pub where_: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub treat: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub mini: String,
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
    /// Logged as the two-minute version (counts 0.7 in the habit score).
    #[serde(default, skip_serializing_if = "is_false")]
    pub mini: bool,
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
    /// log ids logged as the two-minute version
    pub mini: std::collections::HashSet<String>,
    pub cfg: crate::cfg::Cfg,
}
