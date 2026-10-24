#!/bin/bash
# GoalTerra test suite (dev only). Needs Python 3, Playwright and Node.
# Usage: tests/run.sh            -> every test, one summary line per check
#        tests/run.sh qa focus   -> only the named tests (test_<name>.py)
cd "$(dirname "$0")"
python3 -c "
import re;s=open('../goal-tracker.html',encoding='utf-8').read();open('out/app.js','w').write('\n'.join(re.findall(r'<script>(.*?)</script>',s,re.S)))" 2>/dev/null || { mkdir -p out; python3 -c "
import re;s=open('../goal-tracker.html',encoding='utf-8').read();open('out/app.js','w').write('\n'.join(re.findall(r'<script>(.*?)</script>',s,re.S)))"; }
node --check out/app.js && echo "[syntax] ok" || { echo "[syntax] FAIL"; exit 1; }
names=("$@"); [ ${#names[@]} -eq 0 ] && names=(intro_levels due rpg goals_palettes arscan habits qa focus cal tower elite shield reward tt tpl backup insight contrast a11y native perf)
fail=0
for n in "${names[@]}"; do
  out=$(python3 "test_$n.py" 2>&1)
  bad=$(echo "$out" | grep -E "Traceback|Error|FAIL|ov True|errors \[[^]]|COUNT [1-9]|fails [1-9]|misplaced [1-9]|== mine False|keeps False|latin \[[^]]" )
  if [ -n "$bad" ]; then echo "[$n] FAIL"; echo "$bad" | head -5 | sed 's/^/    /'; fail=1; else echo "[$n] ok"; fi
done
exit $fail
