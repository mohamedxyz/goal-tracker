//! Date helpers. Dates are local `YYYY-MM-DD` strings, like the web app.
use chrono::{Datelike, Duration, NaiveDate, Weekday};

pub fn ds(d: NaiveDate) -> String {
    d.format("%Y-%m-%d").to_string()
}

pub fn parse(s: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(s, "%Y-%m-%d").ok()
}

pub fn add_days(d: NaiveDate, n: i64) -> NaiveDate {
    d + Duration::days(n)
}

/// 0 = Sunday .. 6 = Saturday (JS `getDay`).
pub fn js_dow(d: NaiveDate) -> u32 {
    d.weekday().num_days_from_sunday()
}

/// `YYYY-Www` (ISO week).
pub fn iso_week(d: NaiveDate) -> String {
    let w = d.iso_week();
    format!("{}-W{:02}", w.year(), w.week())
}

/// Last day (`YYYY-MM-DD`) of a goal period, or None if the period string is malformed.
pub fn period_end(horizon: &str, p: &str) -> Option<String> {
    match horizon {
        "weekly" => {
            let (y, w) = p.split_once("-W")?;
            let (y, w): (i32, u32) = (y.parse().ok()?, w.parse().ok()?);
            let mon = NaiveDate::from_isoywd_opt(y, w, Weekday::Mon)?;
            Some(ds(add_days(mon, 6)))
        }
        "monthly" => {
            let (y, m) = p.split_once('-')?;
            let (y, m): (i32, u32) = (y.parse().ok()?, m.parse().ok()?);
            Some(ds(last_of_month(y, m)?))
        }
        "annual" => {
            let y: i32 = p.parse().ok().filter(|_| p.len() == 4)?;
            Some(format!("{y:04}-12-31"))
        }
        "five" => {
            let (_, b) = p.split_once('-')?;
            (b.len() == 4 && b.parse::<i32>().is_ok()).then(|| format!("{b}-12-31"))
        }
        _ => None,
    }
}

pub fn last_of_month(y: i32, m: u32) -> Option<NaiveDate> {
    let (ny, nm) = if m == 12 { (y + 1, 1) } else { (y, m + 1) };
    NaiveDate::from_ymd_opt(ny, nm, 1).map(|d| d - Duration::days(1))
}

/// Weeks whose Thursday falls in the month (the web app's default `expected`).
pub fn thursdays_in_month(y: i32, m: u32) -> u32 {
    let Some(last) = last_of_month(y, m) else {
        return 4;
    };
    (1..=last.day())
        .filter(|&d| {
            NaiveDate::from_ymd_opt(y, m, d)
                .map(|x| x.weekday() == Weekday::Thu)
                .unwrap_or(false)
        })
        .count() as u32
}

/// UTC offset in seconds that applies at a UTC time in milliseconds (so DST is handled per timestamp).
pub type Offset<'a> = &'a dyn Fn(i64) -> i32;

/// Local calendar date of a UTC millisecond timestamp.
pub fn local_date(ms: i64, off: Offset) -> Option<NaiveDate> {
    chrono::DateTime::from_timestamp(ms.div_euclid(1000) + off(ms) as i64, 0)
        .map(|d| d.date_naive())
}
