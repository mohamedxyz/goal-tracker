use goalterra_core::{dates::parse, quick::parse_quick};
use serde_json::Value;

#[test]
fn parse_quick_matches_js() {
    let fx: Value = serde_json::from_str(include_str!("fixtures/quick.json")).unwrap();
    let today = parse(fx["today"].as_str().unwrap()).unwrap();
    let mut bad = vec![];
    for c in fx["cases"].as_array().unwrap() {
        let raw = c["raw"].as_str().unwrap();
        let q = parse_quick(raw, today);
        let s = |k: &str| c[k].as_str().map(String::from);
        let ok = q.title == c["title"].as_str().unwrap()
            && q.due == s("due")
            && q.priority == s("priority")
            && q.tag == s("tag")
            && q.start == s("start")
            && q.dur == c["dur"].as_i64();
        if !ok {
            bad.push(format!("{raw:?}\n  rust: {q:?}\n  js:   {c}"));
        }
    }
    assert!(
        bad.is_empty(),
        "{} mismatches:\n{}",
        bad.len(),
        bad.join("\n")
    );
}
