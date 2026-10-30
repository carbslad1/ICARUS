// Run a built ICARUS page headless: its one bundled script goes into a Node vm with just enough browser
// stubbed for it to load, and a hook exposes the simulation. The script keeps its own "use strict", so it
// runs the way the browser runs it.
const fs = require('fs'), vm = require('vm');
const NAMES = ['Hd', 'sw', 'he', 'Br', 'Fl', 'ce', 'AE', 'aw', 'Q', 'Bl', 'Nd', 'XT', 'TE', 'Obt', 'Obnm', 'Obw', 'Obz', 'Obh', 'Ospw', 'Jt', 'lr', 'hw',
  'Owp', 'Owz', 'OwB', 'OwD', 'Owm', 'ObR', 'ObV', 'Ogun', 'hi', 'Tw', 'ww', 'Qd', 'Osp', 'ME', 'Pq', 'touchKill', 'Owc', 'OwK', 'OwL',
  'Owslot', 'Owstart', 'Owfire', 'Owsell', 'Owpr', 'Owsv', 'Owodd', 'Owoffer', 'Owupoffer', 'QT', 'Vd', 'Owsat', 'Owrg', 'Owtg', 'Qz', 'Owwater', 'dw', 'Oq', 'Otk', 'Oqbud', 'Oqcurve', 'Obd', 'ai', 'Dd', 'lw',
  // the forward-only rocket mode (forward.js)
  'Orw', 'Orc', 'Orh', 'Orv', 'Orla', 'Orlk', 'Orgp', 'Orfire', 'Orring', 'Orshock', 'Orsr', 'Orsf', 'Orpq0', 'Oril0', 'Orbake', 'Ll', 'uw',
  '_n', 'qT', 'xn', 'VT', 'je', 'It', 'Ocs', 'YT', 'ht', 'le', 'li', 'Ovz', 'Ovb', 'Ovh', 'nf', 'Il', 'SE', 'Zq',
  'Ochm', 'OcK', 'OcP', 'Ocfire', 'Ocn', 'Octext', 'Ocbuy', 'Ocsell', 'Ocoffer', 'Ocupoffer', 'Ocsv', 'Ocpr', 'Ocwave', 'Octhru', 'OcV', 'rw',
  // scaling rounds and the step 4 shop
  'Oqmix', 'Oqshare', 'OqM', 'Ost', 'OsN', 'Osapply', 'Ostext', 'Ouc', 'OuK', 'Ouoffer', 'Okoffer', 'Okopen', 'Okgear', 'Okpick', 'Okpr', 'Olock', 'Ownmax', 'Olaunch', 'Oshop', 'Opreview', 'Okview', 'Gl', 'Owcard', 'tw', 'Owcan', 'Obo', 'Obb', 'ObbK', 'Obroll', 'Obpeek', 'Obspawn', 'Obpost', 'Oqval', 'Oqshare', 'Obtext', 'ObR', 'Ocfire', 'Owr', 'Owdf', 'Owsetup', 'Owstarter', 'Owsum', 'Oqkill', 'Owdm',
  // the Brotato economy and weapons on the leap (leap.js, 10 Oct)
  'Oxe', 'Olp', 'Oxedrop', 'Oxepay', 'Oxeair', 'Oxebag', 'Oxeneed', 'Oxelvl', 'Oxelose', 'Olpf', 'Olpg', 'Olpgeyser', 'Olpcols', 'Olpbloom', 'Olpsplash', 'Olpram',
  'Olpdepth', 'Oqend', 'Oqpost', 'Owbl', 'Owline', 'Owshoot', 'Owhurt', 'Mr', 'Oqhud', 'Opreview', 'Oqpay', 'Okview', 'Ouoffer', 'Ocoffer', 'Obroll', 'Owtier', 'OcEc', 'Ovn',
  // score chasing (13 Oct): tricks, the hand's score, the charm row, items; both ways
  'Otk', 'OtP', 'OtM', 'Otid', 'Otname', 'Ottime', 'Otbase', 'Otcap', 'Otavail', 'Otpick', 'Ortk', 'Otdone', 'Otasc', 'Otrep', 'Otmult', 'Oscore', 'Ocamt', 'Ocbank',
  'Oskip', 'Ograze', 'Ospout', 'Ocmax', 'Ocleft', 'Ocget', 'Ocinv', 'Oit', 'OiK', 'Oitok', 'Oioffer', 'Oibuy', 'Oxenq', 'Oqopen', 'Oqbank', 'Orf', 'Orface', 'Orc'];
// opts.bake: apply the user's forward-only tuning (Orbake) as a fresh browser would. Off by default, so the
// weapon and hand checks run on the code's own defaults.
// opts.modern: keep the Brotato economy and weapons on the leap (10 Oct) on, as the game ships. Off by
// default: the suites written before them check hands, the quota and cooldown weapons, so they run with
// both sliders at 0 (the game as it was).
exports.load = function (file, store = new Map(), opts = {}) {
  // The suites written for S4 (hands, reels, charms, the quota) run with step 4's rules off, as the game was; a caller
  // that sets the demo's tune itself (the flight-log bot, qa/rules.cjs) gets the shipped defaults for what it leaves out.
  if (!store.has('icarus.scoreshow.tune')) store.set('icarus.scoreshow.tune', JSON.stringify({ rules: 0 }));
  if (!opts.bake && !store.has('icarus.v3.forwardonly.baked')) store.set('icarus.v3.forwardonly.baked', '1');
  if (!opts.bake && !store.has('icarus.v3.spawn11.baked')) store.set('icarus.v3.spawn11.baked', '1');
  const html = fs.readFileSync(file, 'utf8');
  let code = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).sort((a,b) => b.length-a.length)[0];
  // opts.patch: [from, to] text replacements made to an older build before it runs, so it can be compared
  // with the current one on the rules they still share
  for (const [x, y] of opts.patch || []) { if (!code.includes(x)) throw Error('patch anchor not found: ' + x.slice(0, 60)); code = code.split(x).join(y); }
  const END = '})();\n/*! Bundled license';
  if (!code.includes(END)) throw Error('bundle end not found');
  const extra=['FlightLog','Ovv','Zd','Zd0','Xl','jl','ql','of','hr','ft','as','Ocbar','Orhud','iw','Ovr','Owe','wE','EE','DEMO','FiveScore','FiveCombat','ScoreCues','ScoreHUD','RunGuide','ShopUI','Ir','Yl','Routine','Space','Danger','Verbs','Controls','Loadout','Status','Movement'];
  const hook = 'globalThis.__H={get S(){return S},' + [...new Set([...NAMES,...extra])].map(n => `get ${n}(){return typeof ${n}!=="undefined"?${n}:undefined}`).join(',') + '};\n';
  code = code.replace(END, hook + END);
  const any = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? (() => 0) : k === 'then' ? undefined : k === 'length' ? 0 : any,
    apply: () => any, construct: () => any, set: () => true, has: () => true });
  const el = () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false } },
    appendChild() {}, addEventListener() {}, removeEventListener() {}, setAttribute() {}, getAttribute() { return null },
    querySelectorAll() { return [] }, querySelector() { return null }, getContext() { return any },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1440, height: 810 } }, innerHTML: '', textContent: '', children: [],
    width: 0, height: 0, focus() {}, blur() {}, remove() {}, insertAdjacentHTML() {}, toDataURL() { return '' }, closest() { return null } });
  const ctx = { console, Math, JSON, Date, Promise, setTimeout() {}, clearTimeout() {}, setInterval() {}, clearInterval() {},
    document: { createElement: el, getElementById: el, querySelector: () => el(), querySelectorAll: () => [], addEventListener() {},
      body: el(), documentElement: el(), head: el(), visibilityState: 'visible', fonts: { ready: Promise.resolve() } },
    navigator: { userAgent: 'node', platform: 'MacIntel', maxTouchPoints: 0, getGamepads: () => [] },
    localStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    requestAnimationFrame() {}, cancelAnimationFrame() {}, performance: { now: () => Date.now() }, devicePixelRatio: 1,
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }), addEventListener() {}, removeEventListener() {},
    Image: class { set src(v) {} }, innerWidth: 1440, innerHeight: 810, location: { search: '', href: '', hash: '' },
    URL, Blob: class {}, HTMLCanvasElement: class {}, HTMLImageElement: class {}, WebGL2RenderingContext: class {}, WebGLRenderingContext: class {},
    Float32Array, Uint32Array, Uint16Array, Uint8Array, Int32Array, Int16Array, Int8Array, Uint8ClampedArray, Float64Array, ArrayBuffer, DataView,
    Map, Set, WeakMap, WeakSet, Symbol, Reflect, Proxy, Error, TypeError, RangeError, Object, Array, Number, String, Boolean, RegExp, Function,
    parseInt, parseFloat, isNaN, isFinite, structuredClone, queueMicrotask, TextDecoder, TextEncoder, atob, btoa };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { filename: file });
  const H = ctx.__H;
  if (!opts.modern && H.Oxe) { H.Oxe.on = 0; H.Olp.on = 0; }
  return H;
};
// a scripted player: dives to ~25 m, then climbs out at about 58 degrees; coasts in the air. It sends both
// controls: turn steers in the classic mode, w (W held) in the forward-only mode; each mode reads its own.
// Forward-only: no W while diving (the nose drops), W from 25 m down until the nose reaches 58 degrees,
// then let go - the rocket fires.
exports.bot = function (S) {
  const m = S.medium;
  if (m.kind === 'water') {
    const rise = m.pos.y < -25 || m.velocity.y > 0, want = rise ? Math.PI * .32 : -Math.PI * .45;
    const d = Math.atan2(Math.sin(want - m.heading), Math.cos(want - m.heading));
    const w = rise && !m.lock && Math.sin(m.heading) < Math.sin(want);
    return { turn: Math.max(-1, Math.min(1, d * 3)), x: 0, y: w ? 1 : 0, boost: m.pos.y < -8, w };
  }
  return { turn: 0, x: 0, y: 0, boost: false, w: false };
};
