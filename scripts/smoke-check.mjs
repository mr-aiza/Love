import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();
const fail = [];
const pass = (s) => console.log('PASS ' + s);
const need = (p) => {
  if (!existsSync(join(root, p))) fail.push('Missing file: ' + p);
  else pass('exists ' + p);
};

for (const p of ['index.html','story.html','letters.html','wishes.html','calendar.html','qa.html','chat.html','games.html','draw.html','challenges.html','achievements.html','map.html','settings.html','pledge.html','app.js','style.css','config.js','auth.js','worker.js','sw.js','manifest.webmanifest']) need(p);

for (const p of ['app.js','auth.js','v2-enhance.js','sw.js']) {
  if (!existsSync(join(root,p))) continue;
  try { execFileSync('node',['--check',p],{cwd:root,stdio:'pipe'}); pass('syntax ' + p); }
  catch (e) { fail.push('Syntax error in ' + p + ': ' + (e.stderr?.toString() || e.message)); }
}
if (existsSync(join(root,'worker.js'))) {
  try { execFileSync('node',['--input-type=module','--check'],{cwd:root,input:readFileSync(join(root,'worker.js')),stdio:['pipe','pipe','pipe']}); pass('syntax worker.js (ES module)'); }
  catch (e) { fail.push('Syntax error in worker.js: ' + (e.stderr?.toString() || e.message)); }
}

const app = readFileSync(join(root,'app.js'),'utf8');
const routeMatch = app.match(/var R\s*=\s*\{([\s\S]*?)\};/);
if (!routeMatch) fail.push('Could not locate page router R in app.js');
else {
  const routeNames = [...routeMatch[1].matchAll(/(?:^|,)\s*([A-Za-z0-9_-]+)\s*:/g)].map(m=>m[1]);
  for (const route of routeNames) {
    const page = route === 'index' ? 'index.html' : route + '.html';
    if (!existsSync(join(root,page))) fail.push('Router page missing: ' + page);
    else pass('router ' + route + ' -> ' + page);
  }
}

const htmlFiles = readdirSync(root).filter(p=>p.endsWith('.html'));
for (const file of htmlFiles) {
  const html = readFileSync(join(root,file),'utf8');
  for (const m of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css))"/g)) {
    const ref = m[1];
    if (/^(?:https?:)?\/\//.test(ref)) continue;
    if (!existsSync(join(root,ref))) fail.push(file + ' references missing asset ' + ref);
  }
}
if (fail.length) {
  console.error('\nSMOKE TEST FAILED\n- ' + fail.join('\n- '));
  process.exit(1);
}
console.log('\nSMOKE TEST PASSED');
