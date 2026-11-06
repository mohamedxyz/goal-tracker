use goalterra_core::{cfg::Cfg, dates::parse, game::Game, model::*, notify::build_notifications};
use serde_json::Value;

#[test]
fn notifications_match_js() {
    let fx: Value = serde_json::from_str(include_str!("fixtures/notify.json")).unwrap();
    let tz: chrono_tz::Tz = fx["tzName"].as_str().unwrap().parse().unwrap();
    let off = move |ms: i64| {
        use chrono::{Offset, TimeZone};
        tz.offset_from_utc_datetime(
            &chrono::DateTime::from_timestamp(ms.div_euclid(1000), 0)
                .unwrap()
                .naive_utc(),
        )
        .fix()
        .local_minus_utc()
    };
    let st = &fx["state"];
    let v = |k: &str| st[k].clone();
    let today = parse(fx["today"].as_str().unwrap()).unwrap();
    let now_ms = fx["nowMs"].as_i64().unwrap();
    let mut bad = vec![];
    for sc in fx["scen"].as_array().unwrap() {
        let mut s = State {
            tasks: serde_json::from_value(v("tasks")).unwrap(),
            habits: serde_json::from_value(v("habits")).unwrap(),
            exams: serde_json::from_value(v("exams")).unwrap(),
            logs: st["logs"]
                .as_array()
                .unwrap()
                .iter()
                .map(|x| x.as_str().unwrap().to_string())
                .collect(),
            cfg: Cfg::from_json(Some(&sc["cfg"])),
            ..Default::default()
        };
        s.rest_days = s.cfg.rest_days().into_iter().collect();
        let g = Game {
            s: &s,
            today,
            off: &off,
        };
        let got = build_notifications(&g, now_ms, sc["backup"].as_bool().unwrap());
        let want = sc["notifs"].as_array().unwrap();
        let name = sc["name"].as_str().unwrap();
        if got.len() != want.len() {
            bad.push(format!(
                "{name}: {} notifications, js {}",
                got.len(),
                want.len()
            ));
        }
        for (a, b) in got.iter().zip(want) {
            if a.key != b["key"].as_str().unwrap()
                || a.at != b["at"].as_i64().unwrap()
                || a.title != b["title"].as_str().unwrap()
                || a.body != b["body"].as_str().unwrap()
            {
                bad.push(format!("{name}:\n  rust {a:?}\n  js   {b}"));
                break;
            }
        }
    }
    assert!(bad.is_empty(), "{}", bad.join("\n"));
}
