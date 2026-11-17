// Memory of the real game in real Safari, measured from outside the browser.
//   node qa/safari-memory.mjs [--minutes=20] [--speed=2] [--out=qa/feed/safari-memory.jsonl]
// One-time setup (designer): Safari > Settings > Advanced > "Show features for web developers",
// then Develop > "Allow Remote Automation", then in Terminal: safaridriver --enable
// Safari opens an automation window, the test bot (qa/bot.cjs) plays the built game at --speed x real time,
// the page draws every frame, and a new run starts when one ends (same page, no reload).
// Every 5 s it writes one line: wave and object counts from the page, plus the memory footprint
// (what Activity Monitor calls Memory) of every WebKit page process and the WebKit graphics process.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { spawn, execFileSync } from 'node:child_process';
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MINUTES = +arg('minutes', 20), SPEED = +arg('speed', 2), OUT = path.resolve(ROOT, arg('out', 'qa/feed/safari-memory.jsonl'));
const HTTP_PORT = 8791, SD_PORT = 4499, SAMPLE_S = 5;

const server = http.createServer((q, s) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') || f.endsWith('.cjs') ? 'text/javascript' : 'application/octet-stream' }); fs.createReadStream(f).pipe(s); }).listen(HTTP_PORT);
const sd = spawn('safaridriver', ['-p', String(SD_PORT)], { stdio: 'ignore' });
const wd = async (method, p, body) => { const r = await fetch(`http://127.0.0.1:${SD_PORT}${p}`, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body), signal: AbortSignal.timeout(30000) }); const j = await r.json(); if (j.value?.error) throw new Error(j.value.error + ': ' + j.value.message); return j.value; };
const stop = async (sid, why) => { console.log('stopped:', why); if (sid) await wd('DELETE', `/session/${sid}`).catch(() => {}); sd.kill(); server.close(); process.exit(0); };

// footprint of each WebKit process, in MB
const mem = () => { const out = {}; const ps = execFileSync('ps', ['-axo', 'pid=,comm=']).toString().split('\n');
  for (const l of ps) { const m = l.trim().match(/^(\d+)\s+.*com\.apple\.WebKit\.(WebContent|GPU)$/); if (!m) continue;
    try { const f = execFileSync('footprint', ['-p', m[1]], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().match(/Footprint:\s*([\d.]+)\s*(KB|MB|GB)/);
      if (f) out[`${m[2] === 'GPU' ? 'gpu' : 'page'}${m[1]}`] = Math.round(+f[1] * { KB: 1 / 1024, MB: 1, GB: 1024 }[f[2]]); } catch {} }
  return out; };

for (let i = 0; i < 40; i++) { if (await fetch(`http://127.0.0.1:${SD_PORT}/status`).then(r => r.ok, () => false)) break; await new Promise(r => setTimeout(r, 250)); }
let sid;
try { sid = (await wd('POST', '/session', { capabilities: { alwaysMatch: { browserName: 'safari' } } })).sessionId; }
catch (e) { console.log('Safari would not start an automation session:', e.message, '\nSetup: Develop > Allow Remote Automation, then: safaridriver --enable'); await stop(null, 'no session'); }
await wd('POST', `/session/${sid}/window/rect`, { width: 1280, height: 800 }).catch(() => {});
await wd('POST', `/session/${sid}/url`, { url: `http://127.0.0.1:${HTTP_PORT}/ICARUS-demo.html` });
await new Promise(r => setTimeout(r, 2000));
// The free-swim bot (the page's default controls; flyer() is for the carve controls and sits on the seabed here).
await wd('POST', `/session/${sid}/execute/sync`, { args: [fs.readFileSync(path.join(ROOT, 'qa/bot.cjs'), 'utf8'), SPEED], script: `
  const [src, speed] = arguments; const m = { exports: {} }; new Function('module', 'exports', 'require', src)(m, m.exports, () => ({}));
  const G = {}; Object.defineProperty(G, 'Orf', { get: () => icarusDemo.controls.Orf }); Object.defineProperty(G, 'Orgp', { get: () => icarusDemo.controls.Orgp });
  let run = 0; const begin = () => { run++; icarusDemo.start('harpoon', 7 + run); window.__f = m.exports.swimmer(G, 'mid-keep', 7 + run, { keep: 8 }); }; begin();
  window.__run = () => run; let acc = 0, last = performance.now();
  const tick = now => { acc += Math.min(.1, (now - last) / 1000) * speed * 120; last = now; const s = icarusDemo.state;
    if (s.mode === 'shop') { const D = icarusDemo.catalog; for (let k = 0; s.lvup && k < 30; k++) D.command(s, 'level', 0); for (const o of s.demo.offers) if (o.row === 'weapon' && !o.bought && o.price <= s.xp) D.command(s, 'buy', o.uid); D.command(s, 'next'); icarusDemo.render(); }
    else if (s.mode !== 'playing') begin();
    else for (; acc >= 1; acc--) { s.hp = 1e9; const it = __f(s); if (s.medium.kind === 'air' && s.budget <= 0) it.y = -1; icarusDemo.step(s, it, 1 / 120); }
    requestAnimationFrame(tick); };
  requestAnimationFrame(tick);` });

fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, '');
const t0 = Date.now();
while (Date.now() - t0 < MINUTES * 60000) {
  await new Promise(r => setTimeout(r, SAMPLE_S * 1000));
  let game;
  try { game = await wd('POST', `/session/${sid}/execute/sync`, { args: [], script: `const s = icarusDemo.state; return { run: __run(), wave: s.wave, mode: s.mode, gameT: Math.round(s.time), enemies: s.enemies.length, pearls: (s.eorbs || []).length, shots: (s.shots || []).length, domNodes: document.getElementsByTagName('*').length, logMB: icarusDemo.flightLog ? +(icarusDemo.flightLog().length / 1e6).toFixed(1) : null }` }); }
  catch (e) { game = { pageError: e.message }; }
  const row = { realS: Math.round((Date.now() - t0) / 1000), ...game, ...mem() };
  fs.appendFileSync(OUT, JSON.stringify(row) + '\n'); console.log(JSON.stringify(row));
  if (game.pageError) await stop(sid, 'page stopped answering (crash or reload): ' + game.pageError);
}
await stop(sid, `${MINUTES} min done`);
