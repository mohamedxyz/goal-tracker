//! Settings (`cfg`): the web app's settings object with its defaults. Unknown keys are kept as they are.
use serde_json::{Map, Value};

/// `CFG_DEF` from `src/js/75-sounds-config.js`.
const CFG_DEF: &str = r#"{
 "nOn":true,"abOn":false,"abTime":"21:00","abAsked":false,"habitFx":true,"mile":"","nMorning":"08:00","nEvening":"20:00",
 "nClasses":true,"nExams":true,"timeFmt":"auto","weekStart":"mon","planSwipe":true,"ach":null,"planFrom":"06:00","planTo":"24:00",
 "nBlocks":true,"nBlockLead":"10","classes":"","ttStart":"sun","restDays":"","rewards":"","rpgSince":"","eliteTarget":"60",
 "focusLen":"25","breakLen":"5","rpg":false,"taskTarget":6,"coachTone":"off","mTime":false,"dStats":false,"mig84":false,
 "haptics":true,"lvl2":"3","lvl3":"5","stuCompact":false,"avoidHide":true,"cTask":true,"cGoal":true,"cHabit":true,"dCharts":true,
 "dTasks":true,"dGoals":true,"dHabits":true,"prio":"low","showDone":true,"dueDef":"today","sortBy":"due","groupTags":true,
 "autoArch":"0","defFilter":"all","showSubs":true,"showNotes":true,"dOverdue":false,"avoidMode":"clean","student":false,
 "lang":"en","srOn":true,"srWeak":"1","srOk":"3","srLadder":"1,3,7,14,30"}"#;

#[derive(Debug, Clone, PartialEq)]
pub struct Cfg {
    pub map: Map<String, Value>,
}

impl Default for Cfg {
    fn default() -> Self {
        Cfg {
            map: serde_json::from_str::<Map<String, Value>>(CFG_DEF).unwrap(),
        }
    }
}

/// JS unary plus: `+v`. Strings are trimmed; empty is 0; junk is NaN.
pub fn js_num(v: Option<&Value>) -> f64 {
    match v {
        Some(Value::Number(n)) => n.as_f64().unwrap_or(f64::NAN),
        Some(Value::String(s)) => {
            let t = s.trim();
            if t.is_empty() {
                0.0
            } else {
                t.parse().unwrap_or(f64::NAN)
            }
        }
        Some(Value::Bool(b)) => *b as u8 as f64,
        Some(Value::Null) | None => 0.0,
        _ => f64::NAN,
    }
}

/// JS truthiness.
pub fn js_truthy(v: Option<&Value>) -> bool {
    match v {
        Some(Value::Bool(b)) => *b,
        Some(Value::Number(n)) => n.as_f64().map(|x| x != 0.0 && !x.is_nan()).unwrap_or(false),
        Some(Value::String(s)) => !s.is_empty(),
        Some(Value::Null) | None => false,
        _ => true,
    }
}

impl Cfg {
    /// Defaults overlaid with the saved settings object.
    pub fn from_json(saved: Option<&Value>) -> Cfg {
        let mut c = Cfg::default();
        if let Some(Value::Object(m)) = saved {
            for (k, v) in m {
                c.map.insert(k.clone(), v.clone());
            }
        }
        c
    }
    pub fn to_json(&self) -> Value {
        Value::Object(self.map.clone())
    }
    pub fn get(&self, k: &str) -> Option<&Value> {
        self.map.get(k)
    }
    pub fn set(&mut self, k: &str, v: Value) {
        self.map.insert(k.to_string(), v);
    }
    pub fn truthy(&self, k: &str) -> bool {
        js_truthy(self.get(k))
    }
    pub fn num(&self, k: &str) -> f64 {
        js_num(self.get(k))
    }
    /// String value; numbers are formatted like JS, null/missing is "".
    pub fn str(&self, k: &str) -> String {
        match self.get(k) {
            Some(Value::String(s)) => s.clone(),
            Some(Value::Number(n)) => n.to_string(),
            Some(Value::Bool(b)) => b.to_string(),
            _ => String::new(),
        }
    }
    /// `+v || fallback` (zero and NaN fall back).
    pub fn num_or(&self, k: &str, fallback: f64) -> f64 {
        let n = self.num(k);
        if n == 0.0 || n.is_nan() {
            fallback
        } else {
            n
        }
    }

    pub fn student(&self) -> bool {
        self.truthy("student")
    }
    pub fn rpg(&self) -> bool {
        self.truthy("rpg")
    }
    pub fn lang_ar(&self) -> bool {
        self.str("lang") == "ar"
    }
    pub fn rpg_since(&self) -> String {
        self.str("rpgSince")
    }
    pub fn rest_days(&self) -> Vec<String> {
        self.str("restDays")
            .split(',')
            .filter(|x| !x.is_empty())
            .map(String::from)
            .collect()
    }
}
