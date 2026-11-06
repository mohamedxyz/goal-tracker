use goalterra_core::{dates::parse, fmt::*};
use serde_json::Value;

#[test]
fn formats_match_intl() {
    let fx: Vec<Value> = serde_json::from_str(include_str!("fixtures/fmt.json")).unwrap();
    let mut bad = vec![];
    for c in &fx {
        let lang = if c["lang"] == "ar" {
            Lang::Ar
        } else {
            Lang::En
        };
        let d = parse(c["date"].as_str().unwrap()).unwrap();
        let min = c["min"].as_i64().unwrap();
        let got = [
            ("day_full", lang.day_full(d)),
            ("day_md", lang.day_md(d)),
            ("wd_md", lang.wd_md(d)),
            (
                "month_long",
                lang.month_long(chrono::Datelike::month0(&d)).to_string(),
            ),
            ("month_year", lang.month_year(d)),
            ("t_auto", lang.hm_text(min, TimeFmt::Auto)),
            ("t_12", lang.hm_text(min, TimeFmt::H12)),
            ("t_24", lang.hm_text(min, TimeFmt::H24)),
        ];
        for (k, v) in got {
            if v != c[k].as_str().unwrap() {
                bad.push(format!(
                    "{} {} {k}: rust {v:?} js {}",
                    c["lang"], c["date"], c[k]
                ));
            }
        }
    }
    assert!(
        bad.is_empty(),
        "{} mismatches, first:\n{}",
        bad.len(),
        bad.iter().take(8).cloned().collect::<Vec<_>>().join("\n")
    );
}

#[test]
fn len_and_minutes() {
    assert_eq!(Lang::En.len_text(45), "45 min");
    assert_eq!(Lang::En.len_text(60), "1 h");
    assert_eq!(Lang::En.len_text(90), "1.5 h");
    // JS toFixed rounds exact ties up
    for (m, want) in [
        (75, "1.3 h"),
        (105, "1.8 h"),
        (135, "2.3 h"),
        (69, "1.1 h"),
        (66, "1.1 h"),
        (81, "1.4 h"),
    ] {
        assert_eq!(Lang::En.len_text(m), want, "{m}");
    }
    assert_eq!(Lang::Ar.len_text(120), "2 س");
    assert_eq!(to_min("18:30"), 1110);
    assert_eq!(to_min("x"), 0);
    assert_eq!(from_min(65), "01:05");
}
