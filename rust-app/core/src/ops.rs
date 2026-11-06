//! Data operations: what the web app's click handlers do to tasks, habits, goals and trash.
//! Ported from `src/js/90-actions.js`, `65-trash-select-settings-data.js` and `85-backup-planning-review-toast.js`.
//! Each operation changes `State`, saves to the `Store`, and returns effects (sound, toast) for the UI to play.
use crate::dates::*;
use crate::fmt::Lang;
use crate::game::Game;
use crate::logic::*;
use crate::model::*;
use crate::store::{Store, StoreError};
use chrono::{Datelike, NaiveDate};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Sound {
    Task,
    Habit,
    Undo,
    Goal,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Fx {
    Sound(Sound),
    Toast(String),
}

pub type R = Result<Vec<Fx>, StoreError>;

pub const MILES: [u32; 6] = [3, 7, 14, 30, 60, 100];

pub struct Ops<'a> {
    pub s: &'a mut State,
    pub db: &'a Store,
    pub now_ms: i64,
    pub today: NaiveDate,
    pub off: Offset<'a>,
    seq: u64,
}

fn base36(mut n: u64) -> String {
    if n == 0 {
        return "0".into();
    }
    let mut v = vec![];
    while n > 0 {
        v.push(b"0123456789abcdefghijklmnopqrstuvwxyz"[(n % 36) as usize]);
        n /= 36;
    }
    v.reverse();
    String::from_utf8(v).unwrap()
}

/// `stepDue`: the next date of a repeating task.
pub fn step_due(d: NaiveDate, rule: &str) -> NaiveDate {
    match rule {
        "daily" => add_days(d, 1),
        "weekdays" => {
            let mut x = add_days(d, 1);
            while matches!(js_dow(x), 0 | 6) {
                x = add_days(x, 1);
            }
            x
        }
        "weekly" => add_days(d, 7),
        "monthly" => {
            let day = d.day();
            let (y, m) = if d.month() == 12 {
                (d.year() + 1, 1)
            } else {
                (d.year(), d.month() + 1)
            };
            let last = last_of_month(y, m).unwrap().day();
            NaiveDate::from_ymd_opt(y, m, day.min(last)).unwrap()
        }
        _ => d,
    }
}

/// `nextDue`: next due date after the task's own date, skipping past dates.
pub fn next_due(t: &Task, today: NaiveDate) -> String {
    let start = t.due.as_deref().and_then(parse).unwrap_or(today);
    let mut d = step_due(start, &t.repeat);
    let mut i = 0;
    while i < 400 && d < today {
        d = step_due(d, &t.repeat);
        i += 1;
    }
    ds(d)
}

impl<'a> Ops<'a> {
    pub fn new(
        s: &'a mut State,
        db: &'a Store,
        now_ms: i64,
        today: NaiveDate,
        off: Offset<'a>,
    ) -> Self {
        Ops {
            s,
            db,
            now_ms,
            today,
            off,
            seq: 0,
        }
    }

    fn lang(&self) -> Lang {
        Lang::from_cfg(&self.s.cfg)
    }
    fn l2(&self, en: &str, ar: &str) -> String {
        self.lang().l2(en, ar).to_string()
    }
    fn today_k(&self) -> String {
        ds(self.today)
    }

    /// `uid()`: time in base 36 plus a few characters that differ per call.
    pub fn uid(&mut self) -> String {
        self.seq += 1;
        let mut h = (self.now_ms as u64) ^ self.seq.wrapping_mul(0x9E37_79B9_7F4A_7C15);
        h ^= h >> 31;
        h = h.wrapping_mul(0xBF58_476D_1CE4_E5B9);
        h ^= h >> 29;
        let tail = base36(h % 36u64.pow(5));
        format!("{}{:0>5}", base36(self.now_ms as u64), tail)
    }

    pub fn save_cfg(&self) -> Result<(), StoreError> {
        self.db.set_kv("cfg", &self.s.cfg.to_json().to_string())
    }

    /* ---------- tasks ---------- */

    fn task_idx(&self, id: &str) -> Option<usize> {
        self.s.tasks.iter().position(|t| t.id == id)
    }
    fn put_task(&self, i: usize) -> Result<(), StoreError> {
        let t = &self.s.tasks[i];
        self.db.put("tasks", &t.id, t)
    }

    /// `freezeDmg`: remember the game damage a task did when it was finished.
    pub fn freeze_dmg(&mut self, i: usize) {
        if !self.s.tasks[i].done {
            let t = &mut self.s.tasks[i];
            t.dmg = None;
            t.crit = false;
            return;
        }
        if self.s.tasks[i].dmg.is_some() {
            return;
        }
        let k = self.today_k();
        let n = self
            .s
            .tasks
            .iter()
            .filter(|x| {
                x.done
                    && x.done_at
                        .filter(|a| *a != 0)
                        .is_some_and(|a| ds(local_date(a, self.off).unwrap_or(self.today)) == k)
            })
            .count() as i64;
        let t = self.s.tasks[i].clone();
        let at = t.done_at.filter(|a| *a != 0).unwrap_or(self.now_ms);
        let d = Game {
            s: &*self.s,
            today: self.today,
            off: self.off,
        }
        .task_dmg(&t, at, n.max(1));
        let prior: f64 = t.items.iter().map(|it| it.dmg.unwrap_or(0.0)).sum();
        let t = &mut self.s.tasks[i];
        t.dmg = Some(((d.v as f64 - prior) as i64).max(1) as f64);
        if d.crit {
            t.crit = true;
        }
    }

    /// Tick or untick a checklist item. Ticking before the task is done also earns game damage.
    pub fn toggle_sub(&mut self, id: &str, n: usize) -> R {
        let Some(i) = self.task_idx(id) else {
            return Ok(vec![]);
        };
        if n >= self.s.tasks[i].items.len() {
            return Ok(vec![]);
        }
        let base = {
            let t = self.s.tasks[i].clone();
            Game {
                s: &*self.s,
                today: self.today,
                off: self.off,
            }
            .base_dmg(&t)
        };
        let now = self.now_ms;
        let t = &mut self.s.tasks[i];
        let total = t.items.len() as f64;
        let done_task = t.done;
        let it = &mut t.items[n];
        it.done = !it.done;
        if !done_task {
            if it.done {
                it.at = Some(now);
                it.dmg = Some(((base / total).round() as i64).max(1) as f64);
            } else {
                it.at = None;
                it.dmg = None;
            }
        }
        let sound = if it.done { Sound::Task } else { Sound::Undo };
        self.put_task(i)?;
        Ok(vec![Fx::Sound(sound)])
    }

    /// Mark a task done or open again; spawns or removes the next copy of a repeating task.
    pub fn toggle_task(&mut self, id: &str) -> R {
        let Some(i) = self.task_idx(id) else {
            return Ok(vec![]);
        };
        let now = self.now_ms;
        {
            let t = &mut self.s.tasks[i];
            t.done = !t.done;
            t.done_at = if t.done { Some(now) } else { None };
        }
        self.freeze_dmg(i);
        let mut fx = vec![Fx::Sound(if self.s.tasks[i].done {
            Sound::Task
        } else {
            Sound::Undo
        })];
        self.put_task(i)?;
        fx.extend(self.on_task_done(id)?);
        Ok(fx)
    }

    /// `onTaskDone`: repeating tasks create the next one when finished and drop it again if un-finished.
    pub fn on_task_done(&mut self, id: &str) -> R {
        let Some(i) = self.task_idx(id) else {
            return Ok(vec![]);
        };
        let t = self.s.tasks[i].clone();
        if t.repeat.is_empty() {
            return Ok(vec![]);
        }
        if t.done && t.next_id.is_none() {
            let due = next_due(&t, self.today);
            let nid = self.uid();
            let n = Task {
                id: nid.clone(),
                title: t.title.clone(),
                notes: t.notes.clone(),
                repeat: t.repeat.clone(),
                due: Some(due.clone()),
                start: t.start.clone(),
                dur: t.dur.filter(|d| *d != 0.0),
                priority: t.priority.clone(),
                goal_id: t.goal_id.clone().filter(|g| !g.is_empty()),
                tag: t.tag.clone(),
                items: t
                    .items
                    .iter()
                    .map(|x| ChecklistItem {
                        text: x.text.clone(),
                        done: false,
                        ..Default::default()
                    })
                    .collect(),
                done: false,
                created: self.now_ms,
                prev_id: Some(t.id.clone()),
                ..Default::default()
            };
            self.s.tasks[i].next_id = Some(nid);
            self.db.put("tasks", &n.id, &n)?;
            self.s.tasks.push(n);
            self.put_task(i)?;
            let when = self.lang().day_md(parse(&due).unwrap_or(self.today));
            Ok(vec![Fx::Toast(format!(
                "🔁 {}",
                self.l2(
                    &format!("Next \"{}\" on {when}", t.title),
                    &format!("التالية \"{}\" في {when}", t.title)
                )
            ))])
        } else if !t.done && t.next_id.is_some() {
            let nid = t.next_id.clone().unwrap();
            if self.s.tasks.iter().any(|x| x.id == nid && !x.done) {
                self.s.tasks.retain(|x| x.id != nid);
                self.db.del("tasks", &nid)?;
            }
            let i = self.task_idx(id).unwrap();
            self.s.tasks[i].next_id = None;
            self.put_task(i)?;
            Ok(vec![])
        } else {
            Ok(vec![])
        }
    }

    pub fn set_archived(&mut self, ids: &[String], on: bool) -> R {
        for id in ids {
            if let Some(i) = self.task_idx(id) {
                let now = self.now_ms;
                let t = &mut self.s.tasks[i];
                t.archived = on;
                t.archived_at = on.then_some(now);
                self.put_task(i)?;
            }
        }
        Ok(vec![])
    }

    /// Bulk "done": finishes every open task in `ids`.
    pub fn bulk_done(&mut self, ids: &[String]) -> R {
        let list: Vec<String> = self
            .s
            .tasks
            .iter()
            .filter(|t| ids.contains(&t.id) && !t.done)
            .map(|t| t.id.clone())
            .collect();
        let mut fx = vec![];
        for id in &list {
            let i = self.task_idx(id).unwrap();
            let now = self.now_ms;
            let t = &mut self.s.tasks[i];
            t.done = true;
            t.done_at = Some(now);
            self.freeze_dmg(i);
            self.put_task(i)?;
            fx.extend(self.on_task_done(id)?);
        }
        fx.push(Fx::Sound(Sound::Task));
        fx.push(Fx::Toast(self.l2(
            &format!("Marked {} done.", list.len()),
            &format!("تم إنجاز {}.", list.len()),
        )));
        Ok(fx)
    }

    /// Undo for `bulk_done`.
    pub fn bulk_undone(&mut self, ids: &[String]) -> R {
        let mut fx = vec![];
        for id in ids {
            if let Some(i) = self.task_idx(id) {
                let t = &mut self.s.tasks[i];
                t.done = false;
                t.done_at = None;
                self.freeze_dmg(i);
                self.put_task(i)?;
                fx.extend(self.on_task_done(id)?);
            }
        }
        Ok(fx)
    }

    /* ---------- habits ---------- */

    fn put_log(&self, hid: &str, date: &str, mini: bool) -> Result<(), StoreError> {
        let id = format!("{hid}|{date}");
        self.db.put(
            "logs",
            &id,
            &LogEntry {
                id: id.clone(),
                habit_id: hid.into(),
                date: date.into(),
                mini,
                ..Default::default()
            },
        )
    }

    /// Tick or untick a habit day. Avoid habits log slips instead.
    pub fn toggle_log(&mut self, hid: &str, date: &str) -> R {
        let id = format!("{hid}|{date}");
        let Some(h) = self.s.habits.iter().find(|x| x.id == hid).cloned() else {
            return Ok(vec![]);
        };
        let neg = slip_mode(&h);
        let ctx = Ctx {
            s: &*self.s,
            today: self.today,
            off: self.off,
        };
        if self.s.logs.contains(&id) {
            let long = !neg && ctx.streak(&h) >= 7;
            self.s.logs.remove(&id);
            self.s.mini.remove(&id);
            self.db.del("logs", &id)?;
            let mut fx = vec![Fx::Sound(if neg { Sound::Habit } else { Sound::Undo })];
            if long {
                fx.push(Fx::Toast(self.l2(
                    &format!("Removed a check-in from \"{}\".", h.name),
                    &format!("أُزيل تسجيل من \"{}\".", h.name),
                )));
            }
            Ok(fx)
        } else if neg {
            self.s.logs.insert(id);
            self.put_log(hid, date, false)?;
            Ok(vec![
                Fx::Sound(Sound::Undo),
                Fx::Toast(self.l2(
                    &format!("Slip logged for \"{}\". Tap the day again to undo.", h.name),
                    &format!("سُجّل تعثّر في \"{}\". اضغط اليوم مجددًا للتراجع.", h.name),
                )),
            ])
        } else {
            self.s.logs.insert(id.clone());
            self.s.mini.remove(&id);
            self.put_log(hid, date, false)?;
            self.habit_win(&h, date)
        }
    }

    /// The two-minute version counts as a check-in (once per day).
    pub fn log_mini(&mut self, hid: &str, date: &str) -> R {
        let id = format!("{hid}|{date}");
        if self.s.logs.contains(&id) {
            return Ok(vec![]);
        }
        self.s.logs.insert(id.clone());
        self.s.mini.insert(id);
        self.put_log(hid, date, true)?;
        match self.s.habits.iter().find(|x| x.id == hid).cloned() {
            Some(h) => self.habit_win(&h, date),
            None => Ok(vec![]),
        }
    }

    /// Reward for a check-in: milestone, perfect day or folder-complete toast, else just the sound.
    fn habit_win(&mut self, h: &Habit, date: &str) -> R {
        let today = self.today_k();
        let fx_on = self.s.cfg.get("habitFx") != Some(&serde_json::Value::Bool(false));
        if !is_neg(h) && fx_on && date == today {
            let ctx = Ctx {
                s: &*self.s,
                today: self.today,
                off: self.off,
            };
            let s = ctx.streak(h);
            let key = format!("{}:{s}", h.id);
            let mile = self.s.cfg.str("mile");
            let seen: Vec<&str> = mile.split(',').collect();
            if MILES.contains(&s) && !seen.contains(&key.as_str()) {
                let votes = ctx.habit_dates(h).len();
                let mut v: Vec<String> = seen
                    .iter()
                    .filter(|x| !x.is_empty())
                    .map(|x| x.to_string())
                    .collect();
                v.push(key);
                self.s
                    .cfg
                    .set("mile", serde_json::Value::String(v.join(",")));
                self.save_cfg()?;
                let msg = if !h.ident.is_empty() {
                    self.l2(
                        &format!("🔥 {s} days in a row: {votes} votes for being {}", h.ident),
                        &format!("🔥 {s} يومًا متتاليًا: {votes} صوتًا لتصبح {}", h.ident),
                    )
                } else {
                    self.l2(
                        &format!("🔥 {s} days in a row: {}", h.name),
                        &format!("🔥 {s} يومًا متتاليًا: {}", h.name),
                    )
                };
                return Ok(vec![Fx::Sound(Sound::Goal), Fx::Toast(msg)]);
            }
            let ctx = Ctx {
                s: &*self.s,
                today: self.today,
                off: self.off,
            };
            let due: Vec<&Habit> = self
                .s
                .habits
                .iter()
                .filter(|x| !is_neg(x) && is_due(x, self.today))
                .collect();
            if !due.is_empty() && due.iter().all(|x| ctx.good(x, date)) {
                return Ok(vec![
                    Fx::Sound(Sound::Goal),
                    Fx::Toast(self.l2(
                        "🎉 Perfect day: every habit done",
                        "🎉 يوم مثالي: أنجزت كل العادات",
                    )),
                ]);
            }
        }
        let folder = h.group.trim().to_string();
        if !folder.is_empty() && date == today {
            let ctx = Ctx {
                s: &*self.s,
                today: self.today,
                off: self.off,
            };
            let all = self
                .s
                .habits
                .iter()
                .filter(|x| x.group.trim() == folder && is_due(x, self.today))
                .all(|x| ctx.good(x, date));
            if all {
                return Ok(vec![
                    Fx::Sound(Sound::Goal),
                    Fx::Toast(format!("✅ {folder}: all done for today")),
                ]);
            }
        }
        Ok(vec![Fx::Sound(Sound::Habit)])
    }

    /* ---------- goals ---------- */

    fn goal_idx(&self, id: &str) -> Option<usize> {
        self.s.goals.iter().position(|g| g.id == id)
    }
    fn put_goal(&self, i: usize) -> Result<(), StoreError> {
        self.db.put("goals", &self.s.goals[i].id, &self.s.goals[i])
    }

    /// The ✓ button on a goal: complete it by hand, or reopen it.
    pub fn done_goal(&mut self, id: &str) -> R {
        let Some(i) = self.goal_idx(id) else {
            return Ok(vec![]);
        };
        let raw = {
            let g = self.s.goals[i].clone();
            progress_raw(&*self.s, &g, &mut Default::default())
        };
        let now = self.now_ms;
        let g = &mut self.s.goals[i];
        let sound;
        if g.done {
            g.done = false;
            g.auto_done = false;
            g.done_at = None;
            if raw >= 100 {
                g.manual_open = true;
            }
            sound = Sound::Undo;
        } else {
            g.done = true;
            g.auto_done = false;
            g.done_at = Some(now);
            g.status = None;
            g.manual_open = false;
            sound = Sound::Task;
        }
        self.put_goal(i)?;
        Ok(vec![Fx::Sound(sound)])
    }

    /// Number goals: add (or take away) from the current value.
    pub fn goal_add(&mut self, id: &str, delta: f64) -> R {
        let Some(i) = self.goal_idx(id) else {
            return Ok(vec![]);
        };
        let round2 = |x: f64| (x * 100.0).round() / 100.0;
        let g = &mut self.s.goals[i];
        let cur = g.value.filter(|v| v.is_finite()).unwrap_or(0.0);
        g.value = Some(round2((cur + delta).max(0.0)));
        self.put_goal(i)?;
        Ok(vec![])
    }
    pub fn goal_set(&mut self, id: &str, v: f64) -> R {
        let Some(i) = self.goal_idx(id) else {
            return Ok(vec![]);
        };
        self.s.goals[i].value = Some(v.max(0.0));
        self.put_goal(i)?;
        Ok(vec![])
    }

    /// Weekly review: the goal was hit.
    pub fn review_hit(&mut self, id: &str) -> R {
        let Some(i) = self.goal_idx(id) else {
            return Ok(vec![]);
        };
        let now = self.now_ms;
        let g = &mut self.s.goals[i];
        g.done = true;
        g.auto_done = false;
        g.done_at = Some(now);
        g.status = None;
        g.reviewed_at = Some(now);
        self.put_goal(i)?;
        Ok(vec![Fx::Sound(Sound::Task)])
    }
    pub fn review_miss(&mut self, id: &str) -> R {
        let Some(i) = self.goal_idx(id) else {
            return Ok(vec![]);
        };
        let now = self.now_ms;
        let g = &mut self.s.goals[i];
        g.status = Some("missed".into());
        g.reviewed_at = Some(now);
        self.put_goal(i)?;
        Ok(vec![Fx::Sound(Sound::Undo)])
    }
    /// Move an unfinished goal into the current period.
    pub fn review_carry(&mut self, id: &str) -> R {
        let Some(i) = self.goal_idx(id) else {
            return Ok(vec![]);
        };
        let now = self.now_ms;
        let today = self.today;
        let g = &mut self.s.goals[i];
        g.carried.push(g.period.clone());
        g.period = current_period(&g.horizon, today);
        g.reviewed_at = Some(now);
        self.put_goal(i)?;
        Ok(vec![])
    }

    /// Delete a goal: linked tasks and sub-goals are kept but unlinked; the goal goes to the trash.
    pub fn delete_goal(&mut self, id: &str) -> R {
        let Some(gone) = self.s.goals.iter().find(|g| g.id == id).cloned() else {
            return Ok(vec![]);
        };
        let lt: Vec<String> = self
            .s
            .tasks
            .iter()
            .filter(|t| t.goal_id.as_deref() == Some(id))
            .map(|t| t.id.clone())
            .collect();
        let lc: Vec<String> = self
            .s
            .goals
            .iter()
            .filter(|c| c.parent_id.as_deref() == Some(id))
            .map(|c| c.id.clone())
            .collect();
        for tid in &lt {
            let i = self.task_idx(tid).unwrap();
            self.s.tasks[i].goal_id = None;
            self.put_task(i)?;
        }
        for cid in &lc {
            let i = self.goal_idx(cid).unwrap();
            self.s.goals[i].parent_id = None;
            self.put_goal(i)?;
        }
        self.s.goals.retain(|g| g.id != id);
        self.db.del("goals", id)?;
        let links = serde_json::json!({ "tasks": lt, "goals": lc });
        self.trash_add(
            "goal",
            serde_json::to_value(&gone).unwrap(),
            None,
            Some(links),
        )?;
        Ok(vec![Fx::Toast(self.l2("Goal deleted.", "حُذف الهدف."))])
    }

    /* ---------- trash ---------- */

    pub fn trash_add(
        &mut self,
        kind: &str,
        data: serde_json::Value,
        logs: Option<Vec<String>>,
        links: Option<serde_json::Value>,
    ) -> Result<(), StoreError> {
        let id = format!("{kind}:{}", data["id"].as_str().unwrap_or(""));
        let mut extra = std::collections::HashMap::new();
        extra.insert(
            "kind".to_string(),
            serde_json::Value::String(kind.to_string()),
        );
        if let Some(l) = links {
            extra.insert("links".to_string(), l);
        }
        let r = TrashRec {
            id: id.clone(),
            at: self.now_ms,
            data,
            logs: Some(serde_json::to_value(logs.unwrap_or_default()).unwrap()),
            extra,
        };
        self.s.trash.retain(|x| x.id != id);
        self.db.put("trash", &r.id, &r)?;
        self.s.trash.push(r);
        Ok(())
    }

    pub fn remove_tasks(&mut self, ids: &[String]) -> R {
        for id in ids {
            if let Some(i) = self.task_idx(id) {
                let t = self.s.tasks.remove(i);
                self.db.del("tasks", &t.id)?;
                self.trash_add("task", serde_json::to_value(&t).unwrap(), None, None)?;
            }
        }
        Ok(vec![Fx::Toast(
            self.l2("Moved to Trash.", "نُقل إلى المهملات."),
        )])
    }

    pub fn remove_habits(&mut self, ids: &[String]) -> R {
        for id in ids {
            let Some(i) = self.s.habits.iter().position(|h| &h.id == id) else {
                continue;
            };
            let h = self.s.habits.remove(i);
            let pre = format!("{}|", h.id);
            let mut keys: Vec<String> = self
                .s
                .logs
                .iter()
                .filter(|k| k.starts_with(&pre))
                .cloned()
                .collect();
            keys.sort();
            self.db.del("habits", &h.id)?;
            for k in &keys {
                self.s.logs.remove(k);
                self.db.del("logs", k)?;
            }
            self.trash_add("habit", serde_json::to_value(&h).unwrap(), Some(keys), None)?;
        }
        Ok(vec![Fx::Toast(
            self.l2("Moved to Trash.", "نُقل إلى المهملات."),
        )])
    }

    /// Put a deleted item back, with its logs and links.
    pub fn trash_restore(&mut self, id: &str) -> R {
        let Some(r) = self.s.trash.iter().find(|x| x.id == id).cloned() else {
            return Ok(vec![]);
        };
        let kind = r
            .extra
            .get("kind")
            .and_then(|v| v.as_str())
            .unwrap_or("habit")
            .to_string();
        let did = r.data["id"].as_str().unwrap_or("").to_string();
        match kind.as_str() {
            "task" => {
                if self.task_idx(&did).is_none() {
                    let t: Task = serde_json::from_value(r.data.clone())?;
                    self.db.put("tasks", &t.id, &t)?;
                    self.s.tasks.push(t);
                }
            }
            "goal" => {
                if self.goal_idx(&did).is_none() {
                    let g: Goal = serde_json::from_value(r.data.clone())?;
                    self.db.put("goals", &g.id, &g)?;
                    self.s.goals.push(g);
                    let links = r.extra.get("links");
                    let ids = |k: &str| -> Vec<String> {
                        links
                            .and_then(|l| l.get(k))
                            .and_then(|a| a.as_array())
                            .map(|a| {
                                a.iter()
                                    .filter_map(|x| x.as_str().map(String::from))
                                    .collect()
                            })
                            .unwrap_or_default()
                    };
                    for tid in ids("tasks") {
                        if let Some(i) = self.task_idx(&tid) {
                            if self.s.tasks[i].goal_id.as_deref().unwrap_or("").is_empty() {
                                self.s.tasks[i].goal_id = Some(did.clone());
                                self.put_task(i)?;
                            }
                        }
                    }
                    for cid in ids("goals") {
                        if let Some(i) = self.goal_idx(&cid) {
                            if self.s.goals[i]
                                .parent_id
                                .as_deref()
                                .unwrap_or("")
                                .is_empty()
                            {
                                self.s.goals[i].parent_id = Some(did.clone());
                                self.put_goal(i)?;
                            }
                        }
                    }
                }
            }
            "exam" => {
                if !self.s.exams.iter().any(|x| x.id == did) {
                    let e: Exam = serde_json::from_value(r.data.clone())?;
                    self.db.put("exams", &e.id, &e)?;
                    self.s.exams.push(e);
                }
            }
            "topic" => {
                if !self.s.topics.iter().any(|x| x.id == did) {
                    let t: Topic = serde_json::from_value(r.data.clone())?;
                    self.db.put("topics", &t.id, &t)?;
                    self.s.topics.push(t);
                }
            }
            _ => {
                if !self.s.habits.iter().any(|x| x.id == did) {
                    let h: Habit = serde_json::from_value(r.data.clone())?;
                    self.db.put("habits", &h.id, &h)?;
                    self.s.habits.push(h);
                }
                let keys: Vec<String> = r
                    .logs
                    .as_ref()
                    .and_then(|l| l.as_array())
                    .map(|a| {
                        a.iter()
                            .filter_map(|x| x.as_str().map(String::from))
                            .collect()
                    })
                    .unwrap_or_default();
                for k in keys {
                    let i = k.rfind('|').unwrap_or(0);
                    self.s.logs.insert(k.clone());
                    self.put_log(&k[..i], &k[i + 1..], false)?;
                }
            }
        }
        self.s.trash.retain(|x| x.id != id);
        self.db.del("trash", id)?;
        Ok(vec![])
    }

    pub fn trash_delete(&mut self, id: &str) -> R {
        self.s.trash.retain(|x| x.id != id);
        self.db.del("trash", id)?;
        Ok(vec![])
    }
    pub fn trash_empty(&mut self) -> R {
        for r in std::mem::take(&mut self.s.trash) {
            self.db.del("trash", &r.id)?;
        }
        Ok(vec![])
    }
}

/// `currentPeriod(h)`: the period id for today.
pub fn current_period(h: &str, today: NaiveDate) -> String {
    match h {
        "weekly" => iso_week(today),
        "monthly" => ds(today)[..7].to_string(),
        "annual" => today.year().to_string(),
        _ => format!("{}-{}", today.year(), today.year() + 4),
    }
}
