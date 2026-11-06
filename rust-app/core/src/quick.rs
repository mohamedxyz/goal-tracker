//! Smart quick add: pulls a due date, time, length, !priority and #tag out of a title.
//! Ported from `parseQuick` in `src/js/40-quickadd-focus-timer.js`. Uses `fancy-regex` for the look-around the JS relies on.
use crate::dates::*;
use chrono::{Datelike, Duration, NaiveDate};
use fancy_regex::Regex;
use std::sync::LazyLock;

#[derive(Debug, Clone, PartialEq, Default)]
pub struct Quick {
    pub title: String,
    pub due: Option<String>,
    pub priority: Option<String>,
    pub tag: Option<String>,
    /// `HH:MM`
    pub start: Option<String>,
    /// minutes
    pub dur: Option<i64>,
}

fn rx(p: &str) -> Regex {
    Regex::new(p).unwrap()
}

fn weekday_en(w: &str) -> Option<u32> {
    Some(match w {
        "sunday" | "sun" => 0,
        "monday" | "mon" => 1,
        "tuesday" | "tue" | "tues" => 2,
        "wednesday" | "wed" => 3,
        "thursday" | "thu" | "thur" | "thurs" => 4,
        "friday" | "fri" => 5,
        "saturday" | "sat" => 6,
        _ => return None,
    })
}
fn weekday_ar(w: &str) -> Option<u32> {
    Some(match w {
        "أحد" | "احد" => 0,
        "اثنين" | "إثنين" => 1,
        "ثلاثاء" => 2,
        "أربعاء" | "اربعاء" => 3,
        "خميس" => 4,
        "جمعة" | "جمعه" => 5,
        "سبت" => 6,
        _ => return None,
    })
}
const MONTHS: [&str; 12] = [
    "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
];
fn priority_of(w: &str) -> Option<&'static str> {
    Some(match w {
        "high" | "h" | "3" | "عالي" | "عالية" => "high",
        "med" | "medium" | "m" | "2" | "متوسط" | "متوسطة" => "med",
        "low" | "l" | "1" | "منخفض" | "منخفضة" => "low",
        _ => return None,
    })
}

/// Date builder with JS `new Date(y, m, d)` roll-over (day 30 of February becomes March).
fn js_date(y: i32, m0: i32, d: i32) -> Option<NaiveDate> {
    // months outside 0..11 roll the year, like JS
    let y = y + m0.div_euclid(12);
    let m = m0.rem_euclid(12) as u32 + 1;
    NaiveDate::from_ymd_opt(y, m, 1).map(|f| f + Duration::days(d as i64 - 1))
}

const TAKES: &[(&str, u8)] = &[
    ("(?:today|tod|اليوم)", 0),
    ("بعد\\s+(?:غد|غدٍ|بكرة|باچر)", 1),
    ("(?:tomorrow|tmrw?|غدا|غدًا|غداً|بكرة|باچر|باكر)", 2),
    ("in\\s+([0-9]{1,3})\\s+(days?|weeks?)", 3),
    ("بعد\\s+([0-9]{1,3})\\s+(?:أيام|ايام|يوم|يومًا|يوما)", 4),
    ("بعد\\s+([0-9]{1,2})\\s+(?:أسابيع|اسابيع|أسبوع|اسبوع)", 5),
    ("(?:next\\s+week|الأسبوع\\s+القادم|الاسبوع\\s+القادم)", 6),
    (
        "(?:on\\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tues|tue|wed|thurs|thur|thu|fri|sat)",
        7,
    ),
    ("(?:يوم\\s+)?ال(أحد|احد|اثنين|إثنين|ثلاثاء|أربعاء|اربعاء|خميس|جمعة|جمعه|سبت)", 8),
    ("([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})", 9),
    ("([0-9]{1,2})\\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*", 10),
    ("(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\s+([0-9]{1,2})", 11),
];
static TAKE_RX: LazyLock<Vec<(Regex, u8)>> = LazyLock::new(|| {
    TAKES
        .iter()
        .map(|(p, k)| (rx(&format!("(?iu)(?<=\\s){p}(?=\\s)")), *k))
        .collect()
});
static SLASH: LazyLock<Regex> = LazyLock::new(|| rx("(?<=\\s)([0-9]{1,2})/([0-9]{1,2})\\s$"));
static T12: LazyLock<Regex> = LazyLock::new(|| {
    rx("(?iu)(?<=\\s)(?:at\\s+|الساعة\\s+)?([0-9]{1,2})(?::([0-9]{2}))?\\s?(am|pm|ص|م)(?=\\s)")
});
static T24: LazyLock<Regex> = LazyLock::new(|| {
    rx("(?iu)(?<=\\s)(?:at\\s+|الساعة\\s+)?([01]?[0-9]|2[0-3]):([0-5][0-9])(?=\\s)")
});
static DUR: LazyLock<Regex> = LazyLock::new(|| {
    rx("(?iu)(?<=\\s)(?:for|لمدة)\\s+(?:([0-9]+(?:\\.[0-9]+)?)\\s*|(?:an?\\s+)?)(h|hr|hrs|hour|hours|m|min|mins|minute|minutes|ساعة|ساعات|دقيقة|دقائق)(?=\\s)")
});
static PRI: LazyLock<Regex> = LazyLock::new(|| {
    rx("(?iu)(?<=\\s)!(high|medium|med|low|h|m|l|1|2|3|عالي|عالية|متوسط|متوسطة|منخفض|منخفضة)(?=\\s)")
});
static TAG: LazyLock<Regex> = LazyLock::new(|| rx("(?u)(?<=\\s)#([\\p{L}\\p{N}_-]{1,40})(?=\\s)"));
static WS: LazyLock<Regex> = LazyLock::new(|| rx("\\s+"));

/// JS `String.replace(str, ' ')`: replaces the FIRST occurrence of the matched text, wherever it is.
fn replace_first(s: &str, m: &str) -> String {
    s.replacen(m, " ", 1)
}

fn hhmm(h: i64, m: i64) -> Option<String> {
    (0..24)
        .contains(&h)
        .then_some(())
        .filter(|_| (0..60).contains(&m))
        .map(|_| format!("{h:02}:{m:02}"))
}

pub fn parse_quick(raw: &str, today: NaiveDate) -> Quick {
    let collapsed = WS.replace_all(raw, " ").to_string();
    let mut s = format!(" {collapsed} ");
    let (mut due, mut priority, mut tag, mut start, mut dur): (
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<i64>,
    ) = (None, None, None, None, None);
    let t = today;
    let dm = |d: i64, mo: i64| -> Option<NaiveDate> {
        if !((1..=12).contains(&mo) && (1..=31).contains(&d)) {
            return None;
        }
        let x = js_date(t.year(), mo as i32 - 1, d as i32)?;
        if x.day() as i64 != d {
            return None;
        }
        Some(if x < t {
            js_date(t.year() + 1, mo as i32 - 1, d as i32)?
        } else {
            x
        })
    };
    let wd = |i: i64| add_days(t, (i - js_dow(t) as i64 + 7) % 7);
    let num = |m: &fancy_regex::Captures, i: usize| {
        m.get(i)
            .and_then(|x| x.as_str().parse::<i64>().ok())
            .unwrap_or(0)
    };

    for (re, kind) in TAKE_RX.iter() {
        if due.is_some() {
            break;
        }
        let Ok(Some(m)) = re.captures(&s) else {
            continue;
        };
        let full = m.get(0).unwrap().as_str().to_string();
        let d: Option<NaiveDate> = match kind {
            0 => Some(t),
            1 => Some(add_days(t, 2)),
            2 => Some(add_days(t, 1)),
            3 => {
                let unit = m.get(2).unwrap().as_str().to_lowercase();
                Some(add_days(
                    t,
                    num(&m, 1) * if unit.starts_with('w') { 7 } else { 1 },
                ))
            }
            4 => Some(add_days(t, num(&m, 1))),
            5 => Some(add_days(t, 7 * num(&m, 1))),
            6 => {
                let n = (8 - js_dow(t) as i64) % 7;
                Some(add_days(t, if n == 0 { 7 } else { n }))
            }
            7 => {
                let w = m.get(1).unwrap().as_str();
                // an all-caps word such as "SAT" or "MON" is an acronym, not a day
                if w.len() >= 3 && w.chars().all(|c| c.is_ascii_uppercase()) {
                    None
                } else {
                    weekday_en(&w.to_lowercase()).map(|i| wd(i as i64))
                }
            }
            8 => weekday_ar(m.get(1).unwrap().as_str()).map(|i| wd(i as i64)),
            9 => {
                let (y, mo, d) = (num(&m, 1), num(&m, 2), num(&m, 3));
                let y = if (0..=99).contains(&y) { y + 1900 } else { y };
                js_date(y as i32, mo as i32 - 1, d as i32).filter(|x| x.day() as i64 == d)
            }
            10 => {
                let mon = MONTHS
                    .iter()
                    .position(|x| *x == m.get(2).unwrap().as_str().to_lowercase())
                    .map(|i| i as i64 + 1)
                    .unwrap_or(0);
                dm(num(&m, 1), mon)
            }
            _ => {
                let mon = MONTHS
                    .iter()
                    .position(|x| *x == m.get(1).unwrap().as_str().to_lowercase())
                    .map(|i| i as i64 + 1)
                    .unwrap_or(0);
                dm(num(&m, 2), mon)
            }
        };
        if let Some(d) = d {
            due = Some(ds(d));
            s = replace_first(&s, &full);
        }
    }
    if due.is_none() {
        if let Ok(Some(m)) = SLASH.captures(&s) {
            if let Some(d) = dm(num(&m, 1), num(&m, 2)) {
                due = Some(ds(d));
                let idx = m.get(0).unwrap().start();
                s = format!("{} ", &s[..idx]);
            }
        }
    }
    // A time of day ("at 6pm", "6:30pm", "18:00") and then a length ("for 1h", "for 45 min").
    if let Ok(Some(m)) = T12.captures(&s) {
        let h = num(&m, 1);
        if (1..=12).contains(&h) {
            let pm = matches!(
                m.get(3).unwrap().as_str().to_lowercase().as_str(),
                "pm" | "م"
            );
            start = hhmm(h % 12 + if pm { 12 } else { 0 }, num(&m, 2));
            if start.is_some() {
                s = replace_first(&s, m.get(0).unwrap().as_str());
            }
        }
    }
    if start.is_none() {
        if let Ok(Some(m)) = T24.captures(&s) {
            start = hhmm(num(&m, 1), num(&m, 2));
            if start.is_some() {
                s = replace_first(&s, m.get(0).unwrap().as_str());
            }
        }
    }
    if start.is_some() {
        if let Ok(Some(m)) = DUR.captures(&s) {
            let unit = m.get(2).unwrap().as_str().to_lowercase();
            let base = m
                .get(1)
                .and_then(|x| x.as_str().parse::<f64>().ok())
                .unwrap_or(1.0);
            let n = base
                * if unit.starts_with('h') || unit.starts_with("ساع") {
                    60.0
                } else {
                    1.0
                };
            if (5.0..=720.0).contains(&n) {
                dur = Some((n + 0.5).floor() as i64);
                s = replace_first(&s, m.get(0).unwrap().as_str());
            }
        }
    }
    if let Ok(Some(m)) = PRI.captures(&s) {
        priority = priority_of(&m.get(1).unwrap().as_str().to_lowercase()).map(String::from);
        s = replace_first(&s, m.get(0).unwrap().as_str());
    }
    if let Ok(Some(m)) = TAG.captures(&s) {
        tag = Some(m.get(1).unwrap().as_str().to_string());
        s = replace_first(&s, m.get(0).unwrap().as_str());
    }
    let title = WS.replace_all(&s, " ").trim().to_string();
    let title = if title.is_empty() {
        raw.trim().to_string()
    } else {
        title
    };
    Quick {
        title,
        due,
        priority,
        tag,
        start,
        dur,
    }
}
