/**
 * In-app replacements for the browser's confirm, prompt and alert: askConfirm, askPrompt, askAlert.
 * They are async, so always await them.
 * (All src/js files are joined, in filename order, into one shared scope. See src/README.md.)
 */

/* ---------- In-app dialogs (replace confirm / prompt / alert) ---------- */
function askUI(msg, o = {}) {
  return new Promise((res) => {
    const d = document.getElementById('askDlg'),
      inp = d.querySelector('#askIn'),
      no = d.querySelector('#askNo'),
      yes = d.querySelector('#askYes');
    d.querySelector('#askMsg').textContent = String(msg);
    inp.hidden = !o.input;
    inp.value = o.def == null ? '' : String(o.def);
    no.hidden = !!o.alertOnly;
    let out = o.input ? null : false;
    if (o.alertOnly) out = true;
    const fin = () => {
      d.removeEventListener('close', fin);
      res(out);
    };
    d.addEventListener('close', fin);
    yes.onclick = () => {
      out = o.input ? inp.value : true;
      d.close();
    };
    no.onclick = () => {
      out = o.input ? null : false;
      d.close();
    };
    inp.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        yes.click();
      }
    };
    if (!d.open) d.showModal();
    if (o.input)
      setTimeout(() => {
        inp.focus();
        inp.select();
      }, 40);
  });
}
const askConfirm = (m) => askUI(m),
  askPrompt = (m, def) => askUI(m, { input: true, def }),
  askAlert = (m) => askUI(m, { alertOnly: true });
