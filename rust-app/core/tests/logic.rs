use chrono::NaiveDate;
use goalterra_core::{backup, dates, logic::*, model::*};
use std::collections::HashSet;

fn goal(id: &str, h: &str, p: &str, parent: Option<&str>) -> Goal {
    Goal {
        id: id.into(),
        horizon: h.into(),
        period: p.into(),
        parent_id: parent.map(Into::into),
        ..Default::default()
    }
}

#[test]
fn period_ends() {
    assert_eq!(
        dates::period_end("weekly", "2026-W01").as_deref(),
        Some("2026-01-04")
    );
    assert_eq!(
        dates::period_end("monthly", "2026-02").as_deref(),
        Some("2026-02-28")
    );
    assert_eq!(
        dates::period_end("five", "2026-2030").as_deref(),
        Some("2030-12-31")
    );
    assert_eq!(dates::period_end("weekly", "junk"), None);
}

#[test]
fn thursdays() {
    assert_eq!(dates::thursdays_in_month(2026, 1), 5); // Jan 2026: 1,8,15,22,29
    assert_eq!(dates::thursdays_in_month(2026, 2), 4);
}

#[test]
fn rollup_needs_expected_count() {
    let mut s = State::default();
    let mut w = goal("w1", "weekly", "2026-W01", Some("m"));
    w.done = true;
    s.goals = vec![goal("m", "monthly", "2026-01", None), w];
    let m = s.goals[0].clone();
    // 1 finished week of 5 expected: 20%, not 100%
    assert_eq!(progress_raw(&s, &m, &mut HashSet::new()), 20);
}

#[test]
fn sync_completes_and_reopens() {
    let mut s = State::default();
    let g = goal("g", "weekly", "2026-W01", None);
    s.goals = vec![g];
    s.tasks = vec![Task {
        id: "t".into(),
        goal_id: Some("g".into()),
        done: true,
        ..Default::default()
    }];
    let (_, newly) = sync_goals(&mut s, 1);
    assert_eq!(newly, vec!["g".to_string()]);
    assert!(s.goals[0].done);
    s.tasks[0].done = false;
    sync_goals(&mut s, 2);
    assert!(!s.goals[0].done);
}

#[test]
fn streak_skips_days_off() {
    let mut s = State::default();
    // due Mon/Wed only
    let h = Habit {
        id: "h".into(),
        days: vec![1, 3],
        ..Default::default()
    };
    // today = Fri 2026-01-09; Wed 7th and Mon 5th done
    for d in ["2026-01-07", "2026-01-05"] {
        s.logs.insert(format!("h|{d}"));
    }
    let c = Ctx {
        s: &s,
        today: NaiveDate::from_ymd_opt(2026, 1, 9).unwrap(),
        off: &|_| 0,
    };
    assert_eq!(c.streak(&h), 2);
}

#[test]
fn backup_round_trip() {
    let text = r#"{"app":"goal-tracker","version":1,"appVersion":"0.75.0","exported":"x",
      "tasks":[{"id":"a","title":"T","goalId":"g","due":null}],"goals":[],"habits":[],"topics":[],"exams":[],
      "trash":[],"logs":[{"id":"h|2026-01-01","habitId":"h","date":"2026-01-01"}],"settings":{"cfg":{"restDays":"2026-01-02"}}}"#;
    let st = backup::parse(text).unwrap().into_state();
    assert_eq!(st.tasks[0].goal_id.as_deref(), Some("g"));
    assert!(st.logs.contains("h|2026-01-01"));
    assert!(st.rest_days.contains("2026-01-02"));
    assert!(backup::parse(r#"{"app":"other"}"#).is_err());
}
