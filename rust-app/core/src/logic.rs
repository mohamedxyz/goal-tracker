//! Goal progress, goal syncing, habit streaks. Ported from `10-core-data-state.js:163-337`.
use crate::dates::*;
use crate::model::*;
use chrono::NaiveDate;
use std::collections::HashSet;

fn kids<'a>(s: &'a State, id: &str) -> impl Iterator<Item = &'a Goal> {
    let id = id.to_string();
    s.goals
        .iter()
        .filter(move |c| c.parent_id.as_deref() == Some(id.as_str()))
}

pub fn goal_kind(s: &State, g: &Goal) -> String {
    match g.kind.as_deref() {
        Some(k) if !k.is_empty() => k.to_string(),
        _ => if kids(s, &g.id).next().is_some() {
            "rollup"
        } else {
            "check"
        }
        .to_string(),
    }
}

pub fn default_expected(g: &Goal) -> u32 {
    if g.horizon == "monthly" {
        if let Some((y, m)) = g.period.split_once('-') {
            if let (Ok(y), Ok(m)) = (y.parse::<i32>(), m.parse::<u32>()) {
                return thursdays_in_month(y, m);
            }
        }
        return 4;
    }
    match g.horizon.as_str() {
        "annual" => 12,
        "five" => 5,
        _ => 1,
    }
}

pub fn expected_of(g: &Goal) -> u32 {
    let e = g.expected.unwrap_or(0.0);
    let e = if e.is_finite() && e != 0.0 {
        e as i64
    } else {
        default_expected(g) as i64
    };
    e.max(1) as u32
}

pub fn progress_raw(s: &State, g: &Goal, seen: &mut HashSet<String>) -> u32 {
    if !seen.insert(g.id.clone()) {
        return 0;
    }
    match goal_kind(s, g).as_str() {
        "number" => {
            let t = g.target.unwrap_or(0.0);
            let v = g.value.unwrap_or(0.0);
            if t <= 0.0 {
                0
            } else if v >= t {
                100
            } else {
                ((v / t * 100.0).floor() as u32).min(99)
            }
        }
        "rollup" => {
            let ks: Vec<&Goal> = kids(s, &g.id).collect();
            let n = expected_of(g).max(ks.len() as u32);
            let sum: u32 = ks.iter().map(|c| progress(s, c, seen)).sum();
            if sum >= n * 100 {
                100
            } else {
                (sum / n).min(99)
            }
        }
        _ => {
            let t: Vec<&Task> = s
                .tasks
                .iter()
                .filter(|x| x.goal_id.as_deref() == Some(g.id.as_str()))
                .collect();
            if t.is_empty() {
                return 0;
            }
            let d = t.iter().filter(|x| x.done).count();
            if d == t.len() {
                100
            } else {
                ((d * 100 / t.len()) as u32).min(99)
            }
        }
    }
}

pub fn progress(s: &State, g: &Goal, seen: &mut HashSet<String>) -> u32 {
    if g.done {
        100
    } else {
        progress_raw(s, g, seen)
    }
}

pub fn needs_review(g: &Goal, today: &str) -> bool {
    if g.done || g.status.as_deref() == Some("missed") {
        return false;
    }
    period_end(&g.horizon, &g.period)
        .map(|e| e.as_str() < today)
        .unwrap_or(false)
}

/// Auto-complete goals at 100% (cascading up); reopen auto-completed ones that dropped.
/// Returns (ids changed, ids newly completed).
pub fn sync_goals(s: &mut State, now_ms: i64) -> (Vec<String>, Vec<String>) {
    let mut changed: Vec<String> = vec![];
    let mut newly: Vec<String> = vec![];
    let mut dirty = true;
    let mut pass = 0;
    while dirty && pass < 10 {
        dirty = false;
        pass += 1;
        for i in 0..s.goals.len() {
            if s.goals[i].status.as_deref() == Some("missed") {
                continue;
            }
            let raw = progress_raw(s, &s.goals[i].clone(), &mut HashSet::new());
            let id = s.goals[i].id.clone();
            let g = &mut s.goals[i];
            if g.manual_open && raw < 100 {
                g.manual_open = false;
                if !changed.contains(&id) {
                    changed.push(id.clone());
                }
            }
            if !g.done && !g.manual_open && raw >= 100 {
                g.done = true;
                g.auto_done = true;
                g.done_at = Some(now_ms);
                if !changed.contains(&id) {
                    changed.push(id.clone());
                }
                if !newly.contains(&id) {
                    newly.push(id);
                }
                dirty = true;
            } else if g.done && g.auto_done && raw < 100 {
                g.done = false;
                g.auto_done = false;
                g.done_at = None;
                if !changed.contains(&id) {
                    changed.push(id.clone());
                }
                newly.retain(|x| x != &id);
                dirty = true;
            }
        }
    }
    let newly = newly
        .into_iter()
        .filter(|id| s.goals.iter().any(|g| &g.id == id && g.done))
        .collect();
    (changed, newly)
}

/* ---------- habits ---------- */
pub fn is_neg(h: &Habit) -> bool {
    h.kind == "avoid"
}
pub fn slip_mode(h: &Habit) -> bool {
    is_neg(h) && h.mode != "confirm"
}
pub fn has_sched(h: &Habit) -> bool {
    !h.days.is_empty() && h.days.len() < 7
}
pub fn is_due(h: &Habit, d: NaiveDate) -> bool {
    !has_sched(h) || h.days.contains(&js_dow(d))
}
pub fn week_target(h: &Habit) -> u32 {
    if has_sched(h) {
        h.days.len() as u32
    } else {
        h.target.filter(|t| *t > 0).unwrap_or(7)
    }
}

/// Date the habit was created, local time, as `YYYY-MM-DD`.
pub fn born(h: &Habit, off: Offset) -> String {
    local_date(h.created, off).map(ds).unwrap_or_default()
}

pub struct Ctx<'a> {
    pub s: &'a State,
    pub today: NaiveDate,
    pub off: Offset<'a>,
}

impl Ctx<'_> {
    fn logged(&self, h: &Habit, k: &str) -> bool {
        self.s.logs.contains(&format!("{}|{}", h.id, k))
    }

    pub fn good(&self, h: &Habit, k: &str) -> bool {
        if slip_mode(h) {
            k >= born(h, self.off).as_str() && k <= ds(self.today).as_str() && !self.logged(h, k)
        } else {
            self.logged(h, k)
        }
    }

    pub fn streak(&self, h: &Habit) -> u32 {
        let rest = |k: &str| self.s.rest_days.contains(k);
        if slip_mode(h) {
            let (mut n, mut d) = (0, self.today);
            for _ in 0..4000 {
                let k = ds(d);
                if self.good(h, &k) {
                    n += 1;
                } else if !rest(&k) || k.as_str() < born(h, self.off).as_str() {
                    break;
                }
                d = add_days(d, -1);
            }
            return n;
        }
        let mut d = self.today;
        if !self.good(h, &ds(d)) {
            d = add_days(d, -1);
        }
        // Never miss twice: one missed due day is forgiven, two due days in a row end the streak.
        let (mut n, mut miss) = (0, false);
        for _ in 0..1100 {
            let k = ds(d);
            if self.good(h, &k) {
                n += 1;
                miss = false;
            } else if is_due(h, d) && !rest(&k) {
                if miss {
                    break;
                }
                miss = true;
            }
            d = add_days(d, -1);
        }
        n
    }

    /// Done days since Monday of this week.
    pub fn week_count(&self, h: &Habit) -> u32 {
        let dow = (js_dow(self.today) + 6) % 7;
        (0..=dow as i64)
            .filter(|i| self.good(h, &ds(add_days(self.today, -i))))
            .count() as u32
    }

    pub fn rate30(&self, h: &Habit) -> u32 {
        let (mut due, mut n) = (0u32, 0u32);
        for i in 0..30 {
            let d = add_days(self.today, -i);
            if is_neg(h) && ds(d).as_str() < born(h, self.off).as_str() {
                continue;
            }
            if is_due(h, d) {
                due += 1;
                if self.good(h, &ds(d)) {
                    n += 1;
                }
            }
        }
        if due == 0 {
            0
        } else {
            ((n as f64 / due as f64 * 100.0).round() as u32).min(100)
        }
    }
}
