//! Performance: day scores, the GoalTerra scores (0..1000), perfect days, best streak.
//! Ported from `src/js/78-performance.js`, `77-habit-craft.js` and `bestStreak` in `70-render-tips-edit-intro.js`.
use crate::dates::*;
use crate::logic::*;
use crate::model::*;
use chrono::NaiveDate;
use std::collections::HashMap;

fn js_round(x: f64) -> i64 {
    (x + 0.5).floor() as i64
}

#[derive(Debug, Clone, PartialEq)]
pub struct DayScore {
    pub k: String,
    pub due: i64,
    pub done: i64,
    pub pct: Option<i64>,
}

#[derive(Debug, Clone)]
pub struct PerfStats {
    pub days: Vec<DayScore>,
    pub now: Option<i64>,
    pub before: Option<i64>,
}
impl PerfStats {
    pub fn today(&self) -> &DayScore {
        &self.days[13]
    }
    pub fn week(&self) -> &[DayScore] {
        &self.days[7..]
    }
}

const SC_DAYS: usize = 84;
const SC_TAU: f64 = 42.0;

impl Ctx<'_> {
    fn born_k(&self, h: &Habit) -> String {
        born(h, self.off)
    }

    /// Done / due for one day, tasks and habits together.
    pub fn day_score(&self, d: NaiveDate) -> DayScore {
        let k = ds(d);
        let hs: Vec<&Habit> = self
            .s
            .habits
            .iter()
            .filter(|h| !is_neg(h) && is_due(h, d) && k >= self.born_k(h))
            .collect();
        let ts: Vec<&Task> = self
            .s
            .tasks
            .iter()
            .filter(|t| !t.archived && t.due.as_deref() == Some(k.as_str()))
            .collect();
        let due = (hs.len() + ts.len()) as i64;
        let done = hs.iter().filter(|h| self.good(h, &k)).count() as i64
            + ts.iter().filter(|t| t.done).count() as i64;
        let pct = (due > 0).then(|| js_round(done as f64 / due as f64 * 100.0));
        DayScore { k, due, done, pct }
    }

    pub fn perf_stats(&self) -> PerfStats {
        let days: Vec<DayScore> = (0..14)
            .map(|i| self.day_score(add_days(self.today, i - 13)))
            .collect();
        let avg = |a: &[DayScore]| {
            let v: Vec<i64> = a.iter().filter_map(|x| x.pct).collect();
            (!v.is_empty()).then(|| js_round(v.iter().sum::<i64>() as f64 / v.len() as f64))
        };
        PerfStats {
            now: avg(&days[7..]),
            before: avg(&days[..7]),
            days,
        }
    }

    fn sc_day(&self, shift: i64, i: usize) -> NaiveDate {
        add_days(self.today, -shift - (SC_DAYS as i64 - 1 - i as i64))
    }

    pub fn is_mini(&self, hid: &str, k: &str) -> bool {
        let id = format!("{hid}|{k}");
        self.s.mini.contains(&id) && self.s.logs.contains(&id)
    }

    fn habit_day_value(&self, k: &str, d: NaiveDate) -> Option<f64> {
        let hs: Vec<&Habit> = self
            .s
            .habits
            .iter()
            .filter(|h| !is_neg(h) && is_due(h, d) && k >= self.born_k(h).as_str())
            .collect();
        if hs.is_empty() {
            return None;
        }
        let prev = ds(add_days(d, -1));
        let next = ds(add_days(d, 1));
        let today = ds(self.today);
        let mut sum = 0.0;
        for h in &hs {
            if self.good(h, k) {
                sum += if self.is_mini(&h.id, k) { 0.7 } else { 1.0 };
            } else if self.good(h, &prev) || (next <= today && self.good(h, &next)) {
                sum += 0.5;
            }
        }
        Some(sum / hs.len() as f64)
    }

    /// Habit score 0..1000, or None if there are no build habits / nothing due.
    pub fn habit_score(&self, shift: i64) -> Option<i64> {
        if !self.s.habits.iter().any(|h| !is_neg(h)) {
            return None;
        }
        let vals: Vec<Option<f64>> = (0..SC_DAYS)
            .map(|i| {
                let d = self.sc_day(shift, i);
                self.habit_day_value(&ds(d), d)
            })
            .collect();
        ema_series(&vals).map(|e| js_round(1000.0 * e.min(1.0)))
    }

    /// Points per finished task per day; None before the first task existed.
    pub fn task_day_loads(&self, shift: i64, now_ms: i64) -> Vec<Option<f64>> {
        let mut by: HashMap<String, (f64, f64)> = HashMap::new();
        for t in &self.s.tasks {
            if let (true, Some(at)) = (t.done, t.done_at.filter(|a| *a != 0)) {
                let k = ds(local_date(at, self.off).unwrap_or(self.today));
                let o = by.entry(k).or_insert((0.0, 0.0));
                let pts = task_pts(t) + (t.dur.unwrap_or(0.0) / 120.0).min(1.0);
                if t.priority == "high" || t.priority == "med" {
                    o.0 += pts;
                } else {
                    o.1 += pts;
                }
            }
        }
        let first = self.s.tasks.iter().fold(now_ms, |m, t| {
            m.min(if t.created != 0 { t.created } else { now_ms })
        });
        let first_k = ds(local_date(first, self.off).unwrap_or(self.today));
        (0..SC_DAYS)
            .map(|i| {
                let k = ds(self.sc_day(shift, i));
                let o = by.get(&k);
                if k < first_k && o.is_none() {
                    return None;
                }
                Some(o.map(|(m, l)| m + l.min(3.0)).unwrap_or(0.0))
            })
            .collect()
    }

    pub fn task_score(&self, shift: i64, now_ms: i64) -> Option<i64> {
        if self.s.tasks.is_empty() {
            return None;
        }
        let target = self.s.cfg.num_or("taskTarget", 6.0);
        ema_series(&self.task_day_loads(shift, now_ms))
            .map(|e| js_round(1000.0 * (e / target).min(1.0)))
    }

    /// Geometric mean of habit and task scores; with only one of them, that one.
    pub fn overall_score(&self, shift: i64, now_ms: i64) -> Option<i64> {
        match (self.habit_score(shift), self.task_score(shift, now_ms)) {
            (None, None) => None,
            (None, t) => t,
            (h, None) => h,
            (Some(h), Some(t)) => Some(js_round(((h * t) as f64).sqrt())),
        }
    }

    /// Last 7 days far above the 42-day pace: a gentle burnout warning.
    pub fn overpace(&self, now_ms: i64) -> bool {
        let l: Vec<f64> = self
            .task_day_loads(0, now_ms)
            .into_iter()
            .flatten()
            .collect();
        if l.len() < 21 {
            return false;
        }
        let e = ema_series(&l.iter().map(|v| Some(*v)).collect::<Vec<_>>()).unwrap_or(0.0);
        let w = l[l.len() - 7..].iter().sum::<f64>() / 7.0;
        e > 1.0 && w > e * 1.6
    }

    /// Days in the last 60 where every habit that was due (and created) was done.
    pub fn perfect_days(&self) -> i64 {
        (0..60i64)
            .filter(|i| {
                let d = add_days(self.today, -*i);
                let k = ds(d);
                let hs: Vec<&Habit> = self
                    .s
                    .habits
                    .iter()
                    .filter(|h| !is_neg(h) && is_due(h, d) && k >= self.born_k(h))
                    .collect();
                !hs.is_empty() && hs.iter().all(|h| self.good(h, &k))
            })
            .count() as i64
    }

    /// Sorted dates this habit was logged.
    pub fn habit_dates(&self, h: &Habit) -> Vec<String> {
        let pre = format!("{}|", h.id);
        let mut v: Vec<String> = self
            .s
            .logs
            .iter()
            .filter(|k| k.starts_with(&pre))
            .map(|k| k[k.rfind('|').unwrap() + 1..].to_string())
            .collect();
        v.sort();
        v
    }

    pub fn best_streak(&self, h: &Habit) -> u32 {
        let dates = if is_neg(h) {
            vec![self.born_k(h)]
        } else {
            self.habit_dates(h)
        };
        let Some(first) = dates.first().and_then(|d| parse(d)) else {
            return 0;
        };
        let (mut best, mut run, mut miss) = (0u32, 0u32, false);
        let today = ds(self.today);
        let mut d = first;
        while ds(d) <= today {
            let k = ds(d);
            if self.good(h, &k) {
                run += 1;
                miss = false;
                best = best.max(run);
            } else if is_due(h, d) && !self.s.rest_days.contains(&k) && (k != today || slip_mode(h))
            {
                if is_neg(h) || miss {
                    run = 0;
                    miss = false;
                } else {
                    miss = true;
                }
            }
            d = add_days(d, 1);
        }
        best
    }
}

pub fn task_pts(t: &Task) -> f64 {
    match t.priority.as_str() {
        "high" => 3.0,
        "med" => 2.0,
        _ => 1.0,
    }
}

/// Exponentially weighted average (tau 42 days) seeded with the first week; None entries are skipped days.
pub fn ema_series(vals: &[Option<f64>]) -> Option<f64> {
    let live: Vec<f64> = vals.iter().flatten().copied().collect();
    if live.is_empty() {
        return None;
    }
    let n = live.len().min(7);
    let mut e = live[..n].iter().sum::<f64>() / n as f64;
    for v in &live[n..] {
        e += (v - e) / SC_TAU;
    }
    Some(e)
}

/// Habits ordered so each habit follows the one it is stacked after.
pub fn stack_order(list: &[Habit]) -> Vec<&Habit> {
    let ids: std::collections::HashSet<&str> = list.iter().map(|h| h.id.as_str()).collect();
    let mut kids: HashMap<&str, Vec<&Habit>> = HashMap::new();
    let mut roots: Vec<&Habit> = vec![];
    for h in list {
        if !h.after.is_empty() && ids.contains(h.after.as_str()) && h.after != h.id {
            kids.entry(h.after.as_str()).or_default().push(h);
        } else {
            roots.push(h);
        }
    }
    fn add<'a>(
        h: &'a Habit,
        kids: &HashMap<&str, Vec<&'a Habit>>,
        seen: &mut std::collections::HashSet<&'a str>,
        out: &mut Vec<&'a Habit>,
    ) {
        if !seen.insert(h.id.as_str()) {
            return;
        }
        out.push(h);
        if let Some(k) = kids.get(h.id.as_str()) {
            for c in k {
                add(c, kids, seen, out);
            }
        }
    }
    let (mut out, mut seen) = (vec![], std::collections::HashSet::new());
    for h in &roots {
        add(h, &kids, &mut seen, &mut out);
    }
    for h in list {
        add(h, &kids, &mut seen, &mut out);
    }
    out
}
