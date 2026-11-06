use goalterra_core::game::*;

#[test]
fn monsters_match_js() {
    let fx: Vec<serde_json::Value> =
        serde_json::from_str(include_str!("fixtures/monsters.json")).unwrap();
    assert!(fx.len() >= 10);
    for f in fx {
        let key = f["key"].as_str().unwrap();
        let m = monster(key);
        assert_eq!(m.name, f["name"].as_str().unwrap(), "name {key}");
        assert_eq!(m.title, f["title"].as_str().unwrap(), "title {key}");
        assert_eq!(m.svg(), f["svg"].as_str().unwrap(), "svg {key}");
    }
}

#[test]
fn weeks_in_month_values() {
    assert_eq!(weeks_in_month("2026-01"), 5);
    assert_eq!(weeks_in_month("2026-02"), 4);
}

mod oracle {
    use super::*;
    use goalterra_core::{backup::cfg_of, model::*};
    use serde_json::Value;

    fn load(text: &str) -> (Value, State) {
        let fx: Value = serde_json::from_str(text).unwrap();
        let st = &fx["state"];
        let v = |k: &str| st[k].clone();
        let s = State {
            tasks: serde_json::from_value(v("tasks")).unwrap(),
            goals: serde_json::from_value(v("goals")).unwrap(),
            habits: serde_json::from_value(v("habits")).unwrap(),
            topics: serde_json::from_value(v("topics")).unwrap(),
            exams: serde_json::from_value(v("exams")).unwrap(),
            logs: st["logs"]
                .as_array()
                .unwrap()
                .iter()
                .map(|x| x.as_str().unwrap().to_string())
                .collect(),
            rest_days: st["cfg"]["restDays"]
                .as_str()
                .unwrap()
                .split(',')
                .filter(|x| !x.is_empty())
                .map(String::from)
                .collect(),
            mini: st["mini"]
                .as_array()
                .unwrap()
                .iter()
                .map(|x| x.as_str().unwrap().to_string())
                .collect(),
            cfg: cfg_of(Some(&st["cfg"])),
            ..Default::default()
        };
        (fx, s)
    }

    #[test]
    fn rpg_all_matches_js() {
        check(include_str!("fixtures/rpg.json"), false);
    }

    #[test]
    fn rpg_all_matches_js_with_knockouts() {
        check(include_str!("fixtures/rpg_ko.json"), true);
    }

    fn check(text: &str, expect_ko: bool) {
        let (fx, s) = load(text);
        let today = goalterra_core::dates::parse(fx["today"].as_str().unwrap()).unwrap();
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
        let g = Game {
            s: &s,
            today,
            off: &off,
        };
        let a = g.all();
        let j = &fx["rpg"];
        let i = |k: &str| j[k].as_i64().unwrap();
        let jw = j["weeks"].as_array().unwrap();
        assert_eq!(a.weeks.len(), jw.len(), "week count");
        for (w, e) in a.weeks.iter().zip(jw) {
            let ctx = &w.key;
            assert_eq!(&w.key, e["key"].as_str().unwrap());
            assert_eq!(w.t_d, e["tD"].as_i64().unwrap(), "tD {ctx}");
            assert_eq!(w.h_d, e["hD"].as_i64().unwrap(), "hD {ctx}");
            assert_eq!(w.s_d, e["sD"].as_i64().unwrap(), "sD {ctx}");
            assert_eq!(w.f_d, e["fD"].as_i64().unwrap(), "fD {ctx}");
            assert_eq!(w.total, e["total"].as_i64().unwrap(), "total {ctx}");
            assert_eq!(w.hp, e["hp"].as_i64().unwrap(), "hp {ctx}");
            assert_eq!(w.best, e["best"].as_i64().unwrap(), "best {ctx}");
            assert_eq!(w.won, e["won"].as_bool().unwrap(), "won {ctx}");
            assert_eq!(w.ko, e["ko"].as_i64().unwrap(), "ko {ctx}");
            assert_eq!(w.over, e["over"].as_i64().unwrap(), "over {ctx}");
        }
        assert_eq!(a.xp, i("xp"), "xp");
        assert_eq!(a.tot_t, i("totT"));
        assert_eq!(a.tot_h, i("totH"));
        assert_eq!(a.tot_s, i("totS"));
        assert_eq!(a.clean, i("clean"));
        assert_eq!(a.shields, i("shields"), "shields");
        assert_eq!(a.morale, i("morale"), "morale");
        assert_eq!(a.kos, i("kos"));
        if expect_ko {
            assert!(
                a.kos > 0 && a.weeks.iter().any(|w| w.ko > 0),
                "scenario must contain a knockout"
            );
        } else {
            assert!(
                a.weeks.iter().any(|w| w.won && w.over > 0),
                "scenario must contain an overkill win"
            );
        }
        assert_eq!(a.blocked, i("blocked"));
        assert_eq!(a.hits, i("hits"));
        assert_eq!(a.tokens, i("tokens"));
        assert_eq!(a.over_xp, i("overXp"), "overXp");
        assert_eq!(a.streak, i("streak"), "streak");
        assert_eq!(a.best_streak, i("bestStreak"), "bestStreak");
        let ctx = goalterra_core::logic::Ctx {
            s: &s,
            today,
            off: &off,
        };
        for e in fx["habits"].as_array().unwrap() {
            let h = s
                .habits
                .iter()
                .find(|h| h.id == e["id"].as_str().unwrap())
                .unwrap();
            assert_eq!(
                ctx.streak(h) as i64,
                e["streak"].as_i64().unwrap(),
                "streak {}",
                h.id
            );
            assert_eq!(
                ctx.rate30(h) as i64,
                e["rate30"].as_i64().unwrap(),
                "rate30 {}",
                h.id
            );
            assert_eq!(
                ctx.week_count(h) as i64,
                e["weekCount"].as_i64().unwrap(),
                "weekCount {}",
                h.id
            );
        }
        let dd = j["dayD"].as_object().unwrap();
        assert_eq!(a.day_d.len(), dd.len(), "dayD size");
        for (k, v) in dd {
            assert_eq!(a.day_d[k], v.as_i64().unwrap(), "dayD {k}");
        }

        // performance: day scores, GoalTerra scores, perfect days, best streaks
        let p = &fx["perf"];
        let now_ms = fx["nowMs"].as_i64().unwrap();
        let ps = ctx.perf_stats();
        for (d, e) in ps.days.iter().zip(p["days"].as_array().unwrap()) {
            assert_eq!(d.k, e["k"].as_str().unwrap());
            assert_eq!(
                (d.due, d.done, d.pct),
                (
                    e["due"].as_i64().unwrap(),
                    e["done"].as_i64().unwrap(),
                    e["pct"].as_i64()
                ),
                "day {}",
                d.k
            );
        }
        assert_eq!(ps.now, p["now"].as_i64(), "perf now");
        assert_eq!(ps.before, p["before"].as_i64(), "perf before");
        let sc = &p["scores"];
        assert_eq!(ctx.habit_score(0), sc["h0"].as_i64(), "habit score");
        assert_eq!(ctx.habit_score(7), sc["h7"].as_i64(), "habit score -7");
        assert_eq!(ctx.task_score(0, now_ms), sc["t0"].as_i64(), "task score");
        assert_eq!(
            ctx.task_score(7, now_ms),
            sc["t7"].as_i64(),
            "task score -7"
        );
        assert_eq!(ctx.overall_score(0, now_ms), sc["o0"].as_i64(), "overall");
        assert_eq!(
            ctx.overall_score(7, now_ms),
            sc["o7"].as_i64(),
            "overall -7"
        );
        assert_eq!(
            ctx.overpace(now_ms),
            p["overpace"].as_bool().unwrap(),
            "overpace"
        );
        assert_eq!(
            ctx.perfect_days(),
            p["perfectDays"].as_i64().unwrap(),
            "perfect days"
        );
        for e in p["best"].as_array().unwrap() {
            let h = s
                .habits
                .iter()
                .find(|h| h.id == e["id"].as_str().unwrap())
                .unwrap();
            assert_eq!(
                ctx.best_streak(h) as i64,
                e["best"].as_i64().unwrap(),
                "best streak {}",
                h.id
            );
        }

        let t = g.tower(&a);
        let jt = &fx["tower"];
        let jm = jt["months"].as_array().unwrap();
        assert_eq!(t.months.len(), jm.len());
        for (m, e) in t.months.iter().zip(jm) {
            assert_eq!(m.key, e["key"].as_str().unwrap());
            assert_eq!(
                (m.wins, m.gd, m.hp, m.dmg, m.won, m.past),
                (
                    e["wins"].as_i64().unwrap(),
                    e["gd"].as_i64().unwrap(),
                    e["hp"].as_i64().unwrap(),
                    e["dmg"].as_i64().unwrap(),
                    e["won"].as_bool().unwrap(),
                    e["past"].as_bool().unwrap()
                ),
                "month {}",
                m.key
            );
        }
        let jy = jt["years"].as_array().unwrap();
        assert_eq!(t.years.len(), jy.len());
        for (y, e) in t.years.iter().zip(jy) {
            assert_eq!(
                (y.gw, y.ad, y.hp, y.dmg, y.won, y.past),
                (
                    e["gw"].as_i64().unwrap(),
                    e["ad"].as_i64().unwrap(),
                    e["hp"].as_i64().unwrap(),
                    e["dmg"].as_i64().unwrap(),
                    e["won"].as_bool().unwrap(),
                    e["past"].as_bool().unwrap()
                ),
                "year {}",
                y.key
            );
        }

        let el = g.elites();
        let je = fx["elites"].as_array().unwrap();
        assert_eq!(el.len(), je.len());
        for (x, e) in el.iter().zip(je) {
            assert_eq!(x.exam_id, e["id"].as_str().unwrap());
            assert_eq!(
                (x.hp, x.prep, x.bonus),
                (
                    e["hp"].as_i64().unwrap(),
                    e["prep"].as_i64().unwrap(),
                    e["bonus"].as_i64().unwrap()
                )
            );
            assert_eq!(x.pct, e["pct"].as_i64());
            let st = match x.state {
                EliteState::Prep => "prep",
                EliteState::Await => "await",
                EliteState::Won => "won",
                EliteState::Lost => "lost",
            };
            assert_eq!(st, e["state"].as_str().unwrap());
        }
    }
}
