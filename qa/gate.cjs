// The one gate for the playable demo.
//
//   node qa/gate.cjs           quick tier: the build is fresh, port and trick rules (seconds)
//   node qa/gate.cjs --full    adds the camera and enemy rule gates (about 2 minutes, run side by side)
//   node qa/gate.cjs --record  rewrite qa/gate-expected.json from this run (add --full to re-pin the rule gates)
//
// Each suite's result is compared with qa/gate-expected.json. The camera and enemy gates have failures the
// designer accepted as the baseline on 2026-11-12; they are pinned there line by line, numbers included, so a
// new failure, a changed number or a failure that went away all show up as a difference. Re-pin only for a
// change the plan calls for. Never re-pin a worse result without the designer's yes.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { spawn, execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..'), expectedFile = path.join(__dirname, 'gate-expected.json');
const FULL = process.argv.includes('--full'), RECORD = process.argv.includes('--record');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const SUITES = [
  { name: 'port', tier: 'quick', args: ['qa/port.cjs'], mode: 'counts', what: 'armoury, stats and shop rules' },
  { name: 'tricks', tier: 'quick', args: ['qa/tricks.cjs'], mode: 'counts', what: 'the four tricks, ladders on and off' },
  { name: 'rules', tier: 'quick', args: ['qa/rules.cjs'], mode: 'counts', what: 'step 4 scoring and shop rules still hold' },
  { name: 'statuses', tier: 'quick', args: ['qa/statuses.cjs'], mode: 'counts', what: 'burn, slow and the other statuses' },
  { name: 'routine', tier: 'quick', args: ['qa/routine.cjs'], mode: 'counts', what: 'the routine engine the tricks replaced, still intact when switched on' },
  { name: 'shop-ui', tier: 'quick', args: ['qa/shop-ui.cjs'], mode: 'exit', what: 'shop screen checks (named in plan step 2)' },
  { name: 'camera-rules', tier: 'full', args: ['qa/camera-rules.cjs'], mode: 'fail-lines', what: 'camera rules R1 to R6' },
  { name: 'enemy-rules', tier: 'full', args: ['qa/enemy-sandbox.cjs', '--gate'], mode: 'fail-lines', what: 'enemy stage rules' },
];

// 1. The built file must match its sources: tests load ICARUS-demo.html, not source/.
function buildCheck() {
  const out = path.join(root, 'ICARUS-demo.html'), info = JSON.parse(fs.readFileSync(path.join(root, 'build.json'), 'utf8'));
  const problems = [];
  if (sha(fs.readFileSync(out, 'utf8')) !== info.outputSha256) problems.push('ICARUS-demo.html does not match build.json (edited by hand, or build.json is stale)');
  const built = fs.statSync(out).mtimeMs, src = path.join(root, 'source');
  const newer = fs.readdirSync(src).filter(f => /\.(js|cjs|css|html)$/.test(f) && f !== 'watch.cjs' && fs.statSync(path.join(src, f)).mtimeMs > built + 1000);
  if (newer.length) problems.push('changed after the last build: ' + newer.map(f => 'source/' + f).join(', '));
  return problems;
}

function run(suite) {
  return new Promise(resolve => {
    const t0 = Date.now(), child = spawn(process.execPath, suite.args, { cwd: root });
    let text = '';
    child.stdout.on('data', d => text += d); child.stderr.on('data', d => text += d);
    child.on('close', code => {
      const lines = text.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
      const result = { exit: code, seconds: Math.round((Date.now() - t0) / 100) / 10 };
      if (suite.mode === 'exit') result.pinned = { exit: code };
      else if (suite.mode === 'counts') {
        const last = [...lines].reverse().map(l => { try { return JSON.parse(l) } catch { return null } }).find(o => o && 'passed' in o && 'failed' in o);
        result.pinned = last ? { passed: last.passed, failed: last.failed } : { passed: null, failed: null };
        result.failLines = lines.filter(l => /^FAIL\b/.test(l));
      } else {
        result.pinned = { failures: lines.filter(l => /\bFAIL\b/.test(l)) };
        result.outputSha256 = sha(lines.join('\n'));
      }
      resolve(result);
    });
  });
}

const reviewsState = () => { try { return execFileSync('git', ['status', '--porcelain', '--', 'reviews'], { cwd: root, encoding: 'utf8' }) } catch { return '' } };

(async () => {
  const expected = fs.existsSync(expectedFile) ? JSON.parse(fs.readFileSync(expectedFile, 'utf8')) : { suites: {} };
  let ok = true;
  const build = buildCheck();
  if (build.length) { ok = false; console.log('FAIL  build         ' + build.join('; ') + '. Run: node source/build.cjs'); }
  else console.log('PASS  build         ICARUS-demo.html matches build.json and no source file is newer');

  const todo = SUITES.filter(s => FULL || s.tier === 'quick'), before = reviewsState();
  const quick = []; for (const s of todo.filter(s => s.tier === 'quick')) quick.push([s, await run(s)]);
  const full = await Promise.all(todo.filter(s => s.tier === 'full').map(async s => [s, await run(s)]));

  for (const [s, r] of [...quick, ...full]) {
    const want = expected.suites[s.name], label = s.name.padEnd(13);
    if (RECORD) {
      expected.suites[s.name] = { what: s.what, command: 'node ' + s.args.join(' '), mode: s.mode, ...r.pinned, ...(r.outputSha256 ? { outputSha256: r.outputSha256 } : {}) };
      console.log('PIN   ' + label + ' ' + (s.mode === 'exit' ? 'exit code ' + r.pinned.exit : s.mode === 'counts' ? r.pinned.passed + ' pass, ' + r.pinned.failed + ' fail' : r.pinned.failures.length + ' accepted failure(s)') + '  (' + r.seconds + ' s)');
      continue;
    }
    if (!want) { ok = false; console.log('FAIL  ' + label + ' nothing pinned for this suite; run with --record'); continue; }
    if (s.mode === 'exit') {
      const same = r.exit === want.exit;
      if (!same) ok = false;
      console.log((same ? 'PASS  ' : 'FAIL  ') + label + ' ' + (r.exit === 0 ? 'ran clean' : 'exit code ' + r.exit) + (same ? '' : '  (pinned: exit code ' + want.exit + ')') + '  (' + r.seconds + ' s)');
    } else if (s.mode === 'counts') {
      const same = r.pinned.passed === want.passed && r.pinned.failed === want.failed && r.exit === 0;
      if (!same) ok = false;
      console.log((same ? 'PASS  ' : 'FAIL  ') + label + ' ' + r.pinned.passed + ' pass, ' + r.pinned.failed + ' fail' + (same ? '' : '  (pinned: ' + want.passed + ' pass, ' + want.failed + ' fail; exit ' + r.exit + ')') + '  (' + r.seconds + ' s)');
      if (!same) r.failLines.forEach(l => console.log('        ' + l));
    } else {
      const now = new Set(r.pinned.failures), was = new Set(want.failures);
      const added = [...now].filter(l => !was.has(l)), gone = [...was].filter(l => !now.has(l));
      const same = !added.length && !gone.length;
      if (!same) ok = false;
      console.log((same ? 'PASS  ' : 'FAIL  ') + label + ' ' + now.size + ' failure(s), ' + (same ? 'the same as the accepted baseline' : 'different from the accepted baseline of ' + was.size) + '  (' + r.seconds + ' s)');
      added.forEach(l => console.log('        new or changed: ' + l));
      gone.forEach(l => console.log('        no longer failing as pinned: ' + l));
      if (same && want.outputSha256 && want.outputSha256 !== r.outputSha256) console.log('        note: passing numbers moved since the pin (not a failure)');
    }
  }

  if (RECORD) {
    expected.pinned = new Date().toISOString().slice(0, 10);
    expected.note = 'Results the gate is compared with. Failures listed here were accepted by the designer as the baseline (2026-11-12). Re-pin with node qa/gate.cjs --full --record, only for a change the plan calls for.';
    fs.writeFileSync(expectedFile, JSON.stringify({ note: expected.note, pinned: expected.pinned, suites: expected.suites }, null, 2) + '\n');
    console.log('Wrote qa/gate-expected.json');
  }
  const after = reviewsState();
  if (after !== before) console.log('note: a suite changed files under reviews/. Do not commit that churn:\n' + after.trimEnd());
  if (!FULL) console.log('(quick tier only; run with --full before a checkpoint or commit)');
  console.log(RECORD ? 'GATE RECORDED' : ok ? 'GATE PASS' : 'GATE FAIL');
  process.exit(RECORD || ok ? 0 : 1);
})();
