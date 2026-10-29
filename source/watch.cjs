// Rebuilds ICARUS-demo.html whenever a file in source/ changes, so the demo on disk is always current.
//   node source/watch.cjs
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const dir = __dirname, build = path.join(dir, 'build.cjs');
let timer = null;
function rebuild(why) {
  try { execFileSync(process.execPath, [build], { stdio: 'pipe' }); console.log(new Date().toLocaleTimeString(), 'rebuilt', why) }
  catch (e) { console.log(new Date().toLocaleTimeString(), 'BUILD FAILED', why, String(e.stderr || e.message).slice(0, 400)) }
}
rebuild('at start');
fs.watch(dir, (event, file) => {
  if (!file || file === 'watch.cjs' || file.startsWith('.')) return;
  clearTimeout(timer); timer = setTimeout(() => rebuild(file), 150);
});
console.log('watching', dir);
