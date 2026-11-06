//! Date, time and length formatting for English and Arabic (Latin digits), matching what `Intl.DateTimeFormat` gives the web app.
use crate::dates::js_dow;
use crate::fmt_data::*;
use chrono::{Datelike, NaiveDate};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Lang {
    En,
    Ar,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TimeFmt {
    Auto,
    H12,
    H24,
}
impl TimeFmt {
    pub fn parse(s: &str) -> TimeFmt {
        match s {
            "12" => TimeFmt::H12,
            "24" => TimeFmt::H24,
            _ => TimeFmt::Auto,
        }
    }
}

impl Lang {
    pub fn from_cfg(cfg: &crate::cfg::Cfg) -> Lang {
        if cfg.lang_ar() {
            Lang::Ar
        } else {
            Lang::En
        }
    }
    /// English or Arabic text (the web app's `L2`).
    pub fn l2<'a>(self, en: &'a str, ar: &'a str) -> &'a str {
        if self == Lang::Ar {
            ar
        } else {
            en
        }
    }
    fn wd_long(self) -> &'static [&'static str; 7] {
        if self == Lang::Ar {
            &AR_WD_LONG
        } else {
            &EN_WD_LONG
        }
    }
    fn wd_short(self) -> &'static [&'static str; 7] {
        if self == Lang::Ar {
            &AR_WD_SHORT
        } else {
            &EN_WD_SHORT
        }
    }
    fn wd_narrow(self) -> &'static [&'static str; 7] {
        if self == Lang::Ar {
            &AR_WD_NARROW
        } else {
            &EN_WD_NARROW
        }
    }
    fn mon_long(self) -> &'static [&'static str; 12] {
        if self == Lang::Ar {
            &AR_MON_LONG
        } else {
            &EN_MON_LONG
        }
    }
    fn mon_short(self) -> &'static [&'static str; 12] {
        if self == Lang::Ar {
            &AR_MON_SHORT
        } else {
            &EN_MON_SHORT
        }
    }

    /// Weekday names; `dow` is 0 = Sunday.
    pub fn weekday_long(self, dow: u32) -> &'static str {
        self.wd_long()[dow as usize % 7]
    }
    pub fn weekday_short(self, dow: u32) -> &'static str {
        self.wd_short()[dow as usize % 7]
    }
    pub fn weekday_narrow(self, dow: u32) -> &'static str {
        self.wd_narrow()[dow as usize % 7]
    }
    /// `m0` is 0 = January.
    pub fn month_long(self, m0: u32) -> &'static str {
        self.mon_long()[m0 as usize % 12]
    }
    pub fn month_short(self, m0: u32) -> &'static str {
        self.mon_short()[m0 as usize % 12]
    }

    /// "Fri, Oct 23, 2026" / "الجمعة، 23 أكتوبر 2026"
    pub fn day_full(self, d: NaiveDate) -> String {
        let (wd, mo) = (self.weekday_short(js_dow(d)), self.month_short(d.month0()));
        match self {
            Lang::En => format!("{wd}, {mo} {}, {}", d.day(), d.year()),
            Lang::Ar => format!("{wd}، {} {mo} {}", d.day(), d.year()),
        }
    }
    /// "Oct 23" / "23 أكتوبر"
    pub fn day_md(self, d: NaiveDate) -> String {
        let mo = self.month_short(d.month0());
        match self {
            Lang::En => format!("{mo} {}", d.day()),
            Lang::Ar => format!("{} {mo}", d.day()),
        }
    }
    /// "Fri, Oct 23" / "الجمعة، 23 أكتوبر"
    pub fn wd_md(self, d: NaiveDate) -> String {
        let wd = self.weekday_short(js_dow(d));
        match self {
            Lang::En => format!("{wd}, {}", self.day_md(d)),
            Lang::Ar => format!("{wd}، {}", self.day_md(d)),
        }
    }
    /// "October 2026" / "أكتوبر 2026"
    pub fn month_year(self, d: NaiveDate) -> String {
        format!("{} {}", self.month_long(d.month0()), d.year())
    }

    /// Time of day from minutes since midnight: "6:05 PM", "6:05 م", or "18:05" in 24-hour mode.
    pub fn hm_text(self, min: i64, tf: TimeFmt) -> String {
        let (h, m) = ((min / 60).rem_euclid(24), min.rem_euclid(60));
        if tf == TimeFmt::H24 {
            return format!("{h:02}:{m:02}");
        }
        let (ap, h12) = (
            if h < 12 { 0 } else { 1 },
            if h % 12 == 0 { 12 } else { h % 12 },
        );
        let suffix = match (self, ap) {
            (Lang::En, 0) => EN_AM,
            (Lang::En, _) => EN_PM,
            (Lang::Ar, 0) => AR_AM,
            (Lang::Ar, _) => AR_PM,
        };
        format!("{h12}:{m:02}{suffix}")
    }

    /// "45 min", "1 h", "1.5 h" (Arabic: "45 د", "1 س").
    pub fn len_text(self, m: i64) -> String {
        if m < 60 {
            format!("{m}{}", self.l2(" min", " د"))
        } else {
            let h = if m % 60 != 0 {
                to_fixed1(m as f64 / 60.0)
            } else {
                (m / 60).to_string()
            };
            format!("{h}{}", self.l2(" h", " س"))
        }
    }
}

/// "HH:MM" to minutes (junk parts count as 0).
pub fn to_min(hm: &str) -> i64 {
    let mut it = hm.split(':');
    let n = |s: Option<&str>| {
        s.and_then(|x| x.trim().parse::<f64>().ok())
            .filter(|v| v.is_finite())
            .unwrap_or(0.0) as i64
    };
    n(it.next()) * 60 + n(it.next())
}
pub fn from_min(min: i64) -> String {
    format!("{:02}:{:02}", min.div_euclid(60), min.rem_euclid(60))
}

/// JS `x.toFixed(1)`: exact ties round up (Rust's formatter rounds them to even).
pub fn to_fixed1(x: f64) -> String {
    let tie = (x * 4.0).fract() == 0.0 && ((x * 10.0).fract() - 0.5).abs() == 0.0;
    format!("{:.1}", if tie { x + 1e-9 } else { x })
}
