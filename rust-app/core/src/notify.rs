//! Reminder plan for the next 7 days. Ported from `buildNotifications` in `src/js/45-templates-native-notifications.js`.
use crate::dates::*;
use crate::fmt::*;
use crate::game::Game;
use crate::logic::*;
use crate::model::*;
use serde_json::Value;

#[derive(Debug, Clone, PartialEq)]
pub struct Notif {
    pub key: String,
    /// UTC ms
    pub at: i64,
    pub title: String,
    pub body: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Class {
    pub id: String,
    pub subject: String,
    pub day: i64,
    pub start: String,
    pub end: String,
    pub room: String,
}

/// Timetable stored in `cfg.classes` (a JSON string).
pub fn classes(cfg: &crate::cfg::Cfg) -> Vec<Class> {
    let raw = cfg.str("classes");
    let Ok(Value::Array(a)) =
        serde_json::from_str::<Value>(if raw.is_empty() { "[]" } else { &raw })
    else {
        return vec![];
    };
    let s = |v: &Value, k: &str| match v.get(k) {
        Some(Value::String(x)) => x.clone(),
        Some(Value::Number(n)) => n.to_string(),
        _ => String::new(),
    };
    a.iter()
        .map(|c| Class {
            id: s(c, "id"),
            subject: s(c, "subject"),
            day: crate::cfg::js_num(c.get("day")) as i64,
            start: s(c, "start"),
            end: s(c, "end"),
            room: s(c, "room"),
        })
        .collect()
}

pub fn classes_on(cfg: &crate::cfg::Cfg, dow: u32) -> Vec<Class> {
    let mut v: Vec<Class> = classes(cfg)
        .into_iter()
        .filter(|c| c.day == dow as i64)
        .collect();
    v.sort_by(|a, b| a.start.cmp(&b.start));
    v
}

/// `String(hm || fallback).split(':').map(Number)`; None if the hour is not a number.
fn parse_hm(hm: &str, fallback: &str) -> Option<(u32, u32)> {
    let hm = if hm.is_empty() { fallback } else { hm };
    let mut it = hm.split(':');
    let h: f64 = crate::cfg::js_num(Some(&Value::String(it.next().unwrap_or("").to_string())));
    let m: f64 = {
        let v = crate::cfg::js_num(Some(&Value::String(it.next().unwrap_or("").to_string())));
        if v.is_nan() || v == 0.0 {
            0.0
        } else {
            v
        }
    };
    (h.is_finite() && (0.0..24.0).contains(&h) && (0.0..60.0).contains(&m))
        .then_some((h as u32, m as u32))
}

/// Builds the reminders. `backup_due` = the last backup is old or missing.
pub fn build_notifications(g: &Game, now_ms: i64, backup_due: bool) -> Vec<Notif> {
    let s = g.s;
    let cfg = &s.cfg;
    let lang = Lang::from_cfg(cfg);
    let tf = TimeFmt::parse(&cfg.str("timeFmt"));
    let l2 = |en: &str, ar: &str| lang.l2(en, ar).to_string();
    let ctx = Ctx {
        s,
        today: g.today,
        off: g.off,
    };
    let at = |d: chrono::NaiveDate, hm: &str, fb: &str| {
        parse_hm(hm, fb).and_then(|(h, m)| local_ms(d, h, m, g.off))
    };
    let mut out: Vec<Notif> = vec![];
    for i in 0..7i64 {
        let d = add_days(g.today, i);
        let k = ds(d);
        let open = |t: &&Task| !t.done && !t.archived;
        let due = s
            .tasks
            .iter()
            .filter(open)
            .filter(|t| t.due.as_deref() == Some(k.as_str()))
            .count();
        let late = if i == 0 {
            s.tasks
                .iter()
                .filter(open)
                .filter(|t| {
                    t.due
                        .as_deref()
                        .is_some_and(|x| !x.is_empty() && x < k.as_str())
                })
                .count()
        } else {
            0
        };
        let hs: Vec<&Habit> = s
            .habits
            .iter()
            .filter(|h| !is_neg(h) && is_due(h, d) && k >= born(h, g.off))
            .collect();
        let cls = classes_on(cfg, js_dow(d));
        let ex: Vec<&Exam> = if cfg.student() {
            s.exams.iter().filter(|e| e.date == k).collect()
        } else {
            vec![]
        };
        let plural =
            |n: usize, one: &'static str, many: &'static str| if n == 1 { one } else { many };

        if let Some(m) = at(d, &cfg.str("nMorning"), "08:00") {
            if m > now_ms && (due > 0 || !hs.is_empty() || !cls.is_empty() || !ex.is_empty()) {
                let mut bits: Vec<String> = vec![];
                if due > 0 {
                    bits.push(l2(
                        &format!("{due} task{} due", plural(due, "", "s")),
                        &format!("{due} مهام مستحقة"),
                    ));
                }
                if late > 0 {
                    bits.push(l2(&format!("{late} overdue"), &format!("{late} متأخرة")));
                }
                if !hs.is_empty() {
                    let n = hs.len();
                    bits.push(l2(
                        &format!("{n} habit{}", plural(n, "", "s")),
                        &format!("{n} عادات"),
                    ));
                }
                if !cls.is_empty() {
                    let n = cls.len();
                    bits.push(l2(
                        &format!("{n} class{}", plural(n, "", "es")),
                        &format!("{n} حصص"),
                    ));
                }
                for e in &ex {
                    bits.push(format!(
                        "{}{}",
                        if e.kind == "quiz" { "❓ " } else { "📝 " },
                        e.title
                    ));
                }
                out.push(Notif {
                    key: format!("m{k}"),
                    at: m,
                    title: if i == 0 {
                        l2("Today in GoalTerra", "يومك في GoalTerra")
                    } else {
                        lang.day_full(d)
                    },
                    body: bits.join(" · "),
                });
            }
        }
        if let Some(e) = at(d, &cfg.str("nEvening"), "08:00") {
            if e > now_ms {
                let mut body = String::new();
                if i == 0 {
                    let left = hs.iter().filter(|h| !ctx.good(h, &k)).count();
                    let tl = s
                        .tasks
                        .iter()
                        .filter(open)
                        .filter(|t| {
                            t.due
                                .as_deref()
                                .is_some_and(|x| !x.is_empty() && x <= k.as_str())
                        })
                        .count();
                    if left > 0 || tl > 0 {
                        let en = format!(
                            "{}{}{} left today.",
                            if left > 0 {
                                format!("{left} habit{}", plural(left, "", "s"))
                            } else {
                                String::new()
                            },
                            if left > 0 && tl > 0 { " and " } else { "" },
                            if tl > 0 {
                                format!("{tl} task{}", plural(tl, "", "s"))
                            } else {
                                String::new()
                            }
                        );
                        let ar = format!(
                            "{}{}{} متبقية اليوم.",
                            if left > 0 {
                                format!("{left} عادات")
                            } else {
                                String::new()
                            },
                            if left > 0 && tl > 0 { " و" } else { "" },
                            if tl > 0 {
                                format!("{tl} مهام")
                            } else {
                                String::new()
                            }
                        );
                        body = l2(&en, &ar);
                    }
                    if cfg.rpg()
                        && !(g.all().day_d.get(&k).copied().unwrap_or(0) > 0)
                        && !s.rest_days.contains(&k)
                    {
                        if !body.is_empty() {
                            body.push(' ');
                        }
                        body += &l2(
                            "No damage yet: the boss counterattacks tonight.",
                            "لا ضرر بعد: الزعيم سيهاجم الليلة.",
                        );
                    }
                } else if !hs.is_empty() {
                    body = l2(
                        "Evening check-in: tick off today's habits.",
                        "مراجعة المساء: علّم عادات اليوم.",
                    );
                }
                if !body.is_empty() {
                    out.push(Notif {
                        key: format!("e{k}"),
                        at: e,
                        title: l2("Evening check-in", "مراجعة المساء"),
                        body,
                    });
                }
            }
        }
        for h in &hs {
            if !h.at.is_empty() && !(i == 0 && ctx.good(h, &k)) {
                if let Some(when) = at(d, &h.at, "08:00") {
                    if when > now_ms {
                        let body = if !h.mini.is_empty() {
                            l2(
                                &format!("Two-minute version: {}", h.mini),
                                &format!("النسخة السريعة: {}", h.mini),
                            )
                        } else if !h.where_.is_empty() {
                            l2(
                                &format!("Time for it, in {}.", h.where_),
                                &format!("حان وقتها في {}.", h.where_),
                            )
                        } else {
                            l2("Time for your habit.", "حان وقت عادتك.")
                        };
                        out.push(Notif {
                            key: format!("h{k}{}", h.id),
                            at: when,
                            title: format!(
                                "{}{}",
                                if h.icon.is_empty() {
                                    String::new()
                                } else {
                                    format!("{} ", h.icon)
                                },
                                h.name
                            ),
                            body,
                        });
                    }
                }
            }
        }
        if cfg.truthy("nClasses") {
            for c in &cls {
                if let Some(t) = at(d, &c.start, "08:00").map(|x| x - 10 * 60_000) {
                    if t > now_ms {
                        out.push(Notif {
                            key: format!("c{k}{}", c.id),
                            at: t,
                            title: l2(
                                &format!("{} at {}", c.subject, c.start),
                                &format!("{} الساعة {}", c.subject, c.start),
                            ),
                            body: if !c.room.is_empty() {
                                format!("{}{}", l2("Room ", "القاعة "), c.room)
                            } else {
                                l2("Class in 10 minutes", "الحصة بعد 10 دقائق")
                            },
                        });
                    }
                }
            }
        }
        if cfg.truthy("nBlocks") {
            let lead = cfg.num("nBlockLead");
            let lead = if lead.is_nan() { 0.0 } else { lead };
            for t in s
                .tasks
                .iter()
                .filter(open)
                .filter(|t| t.due.as_deref() == Some(k.as_str()) && !t.start.is_empty())
            {
                if let Some(when) = at(d, &t.start, "08:00").map(|x| x - (lead * 60_000.0) as i64) {
                    if when > now_ms {
                        let len = t.dur.filter(|d| *d != 0.0).unwrap_or(60.0) as i64;
                        out.push(Notif {
                            key: format!("b{k}{}", t.id),
                            at: when,
                            title: t.title.clone(),
                            body: format!(
                                "{}{} · {}",
                                l2("Starts at ", "تبدأ الساعة "),
                                lang.hm_text(to_min(&t.start), tf),
                                lang.len_text(len)
                            ),
                        });
                    }
                }
            }
        }
        if cfg.truthy("nExams") && cfg.student() {
            let next = ds(add_days(d, 1));
            for x in s
                .exams
                .iter()
                .filter(|x| x.date == next && x.score.is_none())
            {
                if let Some(t) = at(d, "18:00", "18:00") {
                    if t > now_ms {
                        out.push(Notif {
                            key: format!("x{}", x.id),
                            at: t,
                            title: format!("{}{}", l2("Tomorrow: ", "غدًا: "), x.title),
                            body: format!(
                                "{}{}",
                                if x.time.is_empty() {
                                    String::new()
                                } else {
                                    format!("{} · ", x.time)
                                },
                                l2("A last review tonight helps.", "مراجعة أخيرة الليلة تفيد.")
                            ),
                        });
                    }
                }
            }
        }
    }
    if cfg.truthy("abOn") {
        for i in 0..7i64 {
            let d = add_days(g.today, i);
            if let Some(t) = at(d, &cfg.str("abTime"), "21:00") {
                if t > now_ms {
                    out.push(Notif {
                        key: format!("ab{}", ds(d)),
                        at: t,
                        title: l2("Daily backup", "النسخ الاحتياطي اليومي"),
                        body: l2(
                            "Open GoalTerra to save today's backup.",
                            "افتح GoalTerra لحفظ نسخة اليوم.",
                        ),
                    });
                }
            }
        }
    }
    if backup_due {
        if let Some(t) = at(add_days(g.today, 1), "12:00", "12:00") {
            out.push(Notif {
                key: "bk".into(),
                at: t,
                title: l2("Back up GoalTerra", "انسخ GoalTerra احتياطيًا"),
                body: l2(
                    "Your last backup is old. Open Settings and tap Back up now.",
                    "آخر نسخة احتياطية قديمة. افتح الإعدادات واضغط انسخ احتياطيًا الآن.",
                ),
            });
        }
    }
    out.sort_by_key(|n| n.at);
    out.truncate(60);
    out
}
