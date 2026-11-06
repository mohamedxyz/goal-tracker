use chrono::NaiveDate;
use goalterra_core::{cfg::Cfg, dates::*, model::*, ops::*, store::Store};

const NOW: i64 = 1_792_000_000_000; // 2026-10-14 ~ UTC; only used as a clock value
fn day(s: &str) -> NaiveDate {
    parse(s).unwrap()
}

#[test]
fn step_due_matches_js() {
    let rows: Vec<(String, String, String)> =
        serde_json::from_str(include_str!("fixtures/step_due.json")).unwrap();
    assert_eq!(rows.len(), 36);
    for (start, rule, want) in rows {
        assert_eq!(ds(step_due(day(&start), &rule)), want, "{start} {rule}");
    }
}

#[test]
fn next_due_skips_the_past() {
    let t = Task {
        id: "a".into(),
        due: Some("2026-10-01".into()),
        repeat: "weekly".into(),
        ..Default::default()
    };
    assert_eq!(next_due(&t, day("2026-10-23")), "2026-10-29");
    let none = Task {
        id: "b".into(),
        repeat: "daily".into(),
        ..Default::default()
    };
    assert_eq!(next_due(&none, day("2026-10-23")), "2026-10-24");
}

fn setup() -> (State, Store) {
    let mut s = State::default();
    s.cfg = Cfg::default();
    (s, Store::open_memory().unwrap())
}

#[test]
fn repeating_task_spawns_and_removes_next() {
    let (mut s, db) = setup();
    let t = Task {
        id: "t1".into(),
        title: "Water plants".into(),
        due: Some("2026-10-23".into()),
        repeat: "weekly".into(),
        priority: "med".into(),
        items: vec![ChecklistItem {
            text: "a".into(),
            done: true,
            ..Default::default()
        }],
        ..Default::default()
    };
    db.put("tasks", "t1", &t).unwrap();
    s.tasks.push(t);
    let off = |_: i64| 0;
    let mut ops = Ops::new(&mut s, &db, NOW, day("2026-10-23"), &off);
    let fx = ops.toggle_task("t1").unwrap();
    assert!(fx.contains(&Fx::Sound(Sound::Task)));
    assert!(fx
        .iter()
        .any(|f| matches!(f, Fx::Toast(m) if m.contains("Next \"Water plants\""))));
    assert_eq!(s.tasks.len(), 2);
    let n = &s.tasks[1];
    assert_eq!(n.due.as_deref(), Some("2026-10-30"));
    assert_eq!(n.prev_id.as_deref(), Some("t1"));
    assert!(!n.items[0].done, "checklist resets on the copy");
    assert_eq!(s.tasks[0].next_id.as_deref(), Some(n.id.as_str()));
    assert!(s.tasks[0].dmg.is_some(), "damage is frozen when finished");
    // persisted
    assert_eq!(db.load(0).unwrap().tasks.len(), 2);
    // reopen: the open copy disappears
    let mut ops = Ops::new(&mut s, &db, NOW, day("2026-10-23"), &off);
    ops.toggle_task("t1").unwrap();
    assert_eq!(s.tasks.len(), 1);
    assert!(s.tasks[0].next_id.is_none() && !s.tasks[0].done && s.tasks[0].dmg.is_none());
    assert_eq!(db.load(0).unwrap().tasks.len(), 1);
}

#[test]
fn habit_log_toggle_milestone_and_slip() {
    let (mut s, db) = setup();
    let h = Habit {
        id: "h".into(),
        name: "Read".into(),
        created: NOW - 40 * 86_400_000,
        ..Default::default()
    };
    let neg = Habit {
        id: "n".into(),
        name: "Sugar".into(),
        kind: "avoid".into(),
        created: NOW - 40 * 86_400_000,
        ..Default::default()
    };
    s.habits = vec![h, neg];
    // 2 days done already, today makes 3 in a row = milestone
    s.logs.insert("h|2026-10-21".into());
    s.logs.insert("h|2026-10-22".into());
    let off = |_: i64| 0;
    let mut ops = Ops::new(&mut s, &db, NOW, day("2026-10-23"), &off);
    let fx = ops.toggle_log("h", "2026-10-23").unwrap();
    assert!(fx.contains(&Fx::Sound(Sound::Goal)));
    assert!(fx
        .iter()
        .any(|f| matches!(f, Fx::Toast(m) if m.contains("3 days in a row"))));
    assert!(s.cfg.str("mile").contains("h:3"));
    assert!(db.kv("cfg").unwrap().unwrap().contains("h:3"));
    // untick
    let mut ops = Ops::new(&mut s, &db, NOW, day("2026-10-23"), &off);
    let fx = ops.toggle_log("h", "2026-10-23").unwrap();
    assert_eq!(fx, vec![Fx::Sound(Sound::Undo)]);
    assert!(!s.logs.contains("h|2026-10-23"));
    // a slip, then undo
    let mut ops = Ops::new(&mut s, &db, NOW, day("2026-10-23"), &off);
    let fx = ops.toggle_log("n", "2026-10-23").unwrap();
    assert!(fx
        .iter()
        .any(|f| matches!(f, Fx::Toast(m) if m.contains("Slip logged"))));
    assert!(s.logs.contains("n|2026-10-23"));
    // two-minute version marks the log
    let mut ops = Ops::new(&mut s, &db, NOW, day("2026-10-23"), &off);
    ops.log_mini("h", "2026-10-23").unwrap();
    assert!(s.mini.contains("h|2026-10-23"));
    assert!(db.load(0).unwrap().mini.contains("h|2026-10-23"));
    let mut ops = Ops::new(&mut s, &db, NOW, day("2026-10-23"), &off);
    assert!(
        ops.log_mini("h", "2026-10-23").unwrap().is_empty(),
        "second time does nothing"
    );
}

#[test]
fn goal_delete_and_restore_relinks() {
    let (mut s, db) = setup();
    s.goals = vec![
        Goal {
            id: "m".into(),
            title: "Month".into(),
            horizon: "monthly".into(),
            period: "2026-10".into(),
            ..Default::default()
        },
        Goal {
            id: "w".into(),
            title: "Week".into(),
            horizon: "weekly".into(),
            period: "2026-W43".into(),
            parent_id: Some("m".into()),
            ..Default::default()
        },
    ];
    s.tasks = vec![Task {
        id: "t".into(),
        goal_id: Some("m".into()),
        ..Default::default()
    }];
    let off = |_: i64| 0;
    let mut ops = Ops::new(&mut s, &db, NOW, day("2026-10-23"), &off);
    ops.delete_goal("m").unwrap();
    assert_eq!(s.goals.len(), 1);
    assert!(s.goals[0].parent_id.is_none());
    assert!(s.tasks[0].goal_id.is_none());
    assert_eq!(s.trash.len(), 1);
    assert_eq!(s.trash[0].id, "goal:m");
    let mut ops = Ops::new(&mut s, &db, NOW, day("2026-10-23"), &off);
    ops.trash_restore("goal:m").unwrap();
    assert_eq!(s.goals.len(), 2);
    assert_eq!(
        s.goals
            .iter()
            .find(|g| g.id == "w")
            .unwrap()
            .parent_id
            .as_deref(),
        Some("m")
    );
    assert_eq!(s.tasks[0].goal_id.as_deref(), Some("m"));
    assert!(s.trash.is_empty());
    assert!(db.load(0).unwrap().trash.is_empty());
}

#[test]
fn habit_trash_keeps_history() {
    let (mut s, db) = setup();
    s.habits = vec![Habit {
        id: "h".into(),
        name: "Run".into(),
        ..Default::default()
    }];
    for d in ["2026-10-01", "2026-10-02"] {
        s.logs.insert(format!("h|{d}"));
        db.log_set("h", d, true).unwrap();
    }
    s.logs.insert("x|2026-10-01".into());
    let off = |_: i64| 0;
    let mut ops = Ops::new(&mut s, &db, NOW, day("2026-10-23"), &off);
    ops.remove_habits(&["h".to_string()]).unwrap();
    assert!(
        s.habits.is_empty() && s.logs.len() == 1,
        "only the other habit's log remains"
    );
    assert_eq!(
        db.load(0).unwrap().logs.len(),
        0 + 1 - 1 + 0,
        "store logs for h removed"
    );
    let mut ops = Ops::new(&mut s, &db, NOW, day("2026-10-23"), &off);
    ops.trash_restore("habit:h").unwrap();
    assert_eq!(s.habits.len(), 1);
    assert!(s.logs.contains("h|2026-10-01") && s.logs.contains("h|2026-10-02"));
    assert_eq!(db.load(0).unwrap().logs.len(), 2);
}

#[test]
fn bulk_done_and_undo() {
    let (mut s, db) = setup();
    s.tasks = vec![
        Task {
            id: "a".into(),
            priority: "high".into(),
            ..Default::default()
        },
        Task {
            id: "b".into(),
            done: true,
            done_at: Some(1),
            ..Default::default()
        },
        Task {
            id: "c".into(),
            ..Default::default()
        },
    ];
    let off = |_: i64| 0;
    let ids: Vec<String> = ["a", "b", "c"].iter().map(|x| x.to_string()).collect();
    let mut ops = Ops::new(&mut s, &db, NOW, day("2026-10-23"), &off);
    let fx = ops.bulk_done(&ids).unwrap();
    assert!(fx
        .iter()
        .any(|f| matches!(f, Fx::Toast(m) if m == "Marked 2 done.")));
    assert!(s.tasks.iter().all(|t| t.done));
    let mut ops = Ops::new(&mut s, &db, NOW, day("2026-10-23"), &off);
    ops.bulk_undone(&["a".to_string(), "c".to_string()])
        .unwrap();
    assert!(!s.tasks[0].done && s.tasks[1].done && !s.tasks[2].done);
}

#[test]
fn goal_values_and_checks() {
    let (mut s, db) = setup();
    s.goals = vec![Goal {
        id: "g".into(),
        kind: Some("number".into()),
        target: Some(3.0),
        ..Default::default()
    }];
    let off = |_: i64| 0;
    let mut ops = Ops::new(&mut s, &db, NOW, day("2026-10-23"), &off);
    ops.goal_add("g", 1.0).unwrap();
    ops.goal_add("g", 1.5).unwrap();
    assert_eq!(s.goals[0].value, Some(2.5));
    let mut ops = Ops::new(&mut s, &db, NOW, day("2026-10-23"), &off);
    ops.goal_add("g", -10.0).unwrap();
    assert_eq!(s.goals[0].value, Some(0.0));
    let mut ops = Ops::new(&mut s, &db, NOW, day("2026-10-23"), &off);
    ops.done_goal("g").unwrap();
    assert!(s.goals[0].done && !s.goals[0].auto_done);
    let mut ops = Ops::new(&mut s, &db, NOW, day("2026-10-23"), &off);
    ops.done_goal("g").unwrap();
    assert!(!s.goals[0].done);
}
