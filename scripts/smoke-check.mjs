import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();
const fail = [];
const pass = (s) => console.log('PASS ' + s);

const need = (p) => {
  if (!existsSync(join(root, p))) {
    fail.push('Missing file: ' + p);
  } else {
    pass('exists ' + p);
  }
};

// Required project files.
for (const p of [
  'index.html',
  'story.html',
  'letters.html',
  'wishes.html',
  'calendar.html',
  'qa.html',
  'chat.html',
  'games.html',
  'draw.html',
  'challenges.html',
  'achievements.html',
  'map.html',
  'settings.html',
  'pledge.html',
  'app.js',
  'style.css',
  'config.js',
  'auth.js',
  'worker.js',
  'sw.js',
  'manifest.webmanifest'
]) {
  need(p);
}

// JavaScript syntax checks.
for (const p of ['app.js', 'auth.js', 'v2-enhance.js', 'sw.js']) {
  if (!existsSync(join(root, p))) continue;

  try {
    execFileSync('node', ['--check', p], {
      cwd: root,
      stdio: 'pipe'
    });
    pass('syntax ' + p);
  } catch (e) {
    fail.push(
      'Syntax error in ' + p + ': ' +
      (e.stderr?.toString() || e.message)
    );
  }
}

// Cloudflare Worker syntax check as an ES module.
if (existsSync(join(root, 'worker.js'))) {
  try {
    execFileSync(
      'node',
      ['--input-type=module', '--check'],
      {
        cwd: root,
        input: readFileSync(join(root, 'worker.js')),
        stdio: ['pipe', 'pipe', 'pipe']
      }
    );
    pass('syntax worker.js (ES module)');
  } catch (e) {
    fail.push(
      'Syntax error in worker.js: ' +
      (e.stderr?.toString() || e.message)
    );
  }
}

const app = readFileSync(join(root, 'app.js'), 'utf8');
const worker = readFileSync(join(root, 'worker.js'), 'utf8');

// Check that every page declared in the router exists.
const routeMatch = app.match(/var R\s*=\s*\{([\s\S]*?)\};/);

if (!routeMatch) {
  fail.push('Could not locate page router R in app.js');
} else {
  const routeNames = [
    ...routeMatch[1].matchAll(/(?:^|,)\s*([A-Za-z0-9_-]+)\s*:/g)
  ].map((m) => m[1]);

  for (const route of routeNames) {
    const page = route === 'index' ? 'index.html' : route + '.html';

    if (!existsSync(join(root, page))) {
      fail.push('Router page missing: ' + page);
    } else {
      pass('router ' + route + ' -> ' + page);
    }
  }
}

// Check local JavaScript and CSS references in HTML files.
const htmlFiles = readdirSync(root).filter((p) => p.endsWith('.html'));

for (const file of htmlFiles) {
  const html = readFileSync(join(root, file), 'utf8');

  for (const m of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css))"/g)) {
    const ref = m[1];

    if (/^(?:https?:)?\/\//.test(ref)) continue;

    if (!existsSync(join(root, ref))) {
      fail.push(file + ' references missing asset ' + ref);
    }
  }
}

// Regression checks for independent "This or That" rounds.
const choiceChecks = [
  [
    'choice round identifier is generated',
    /var choiceRound=cq\.round\|\|\('q'\+cq\.q\)/.test(app)
  ],
  [
    'answers are matched to the active question and round',
    /choiceA&&choiceA\.q===cq\.q&&choiceA\.round===choiceRound/.test(app) &&
    /choiceB&&choiceB\.q===cq\.q&&choiceB\.round===choiceRound/.test(app)
  ],
  [
    'answer records retain their round identifier',
    /set\('game:choice:'\+role,\{q:cur\.q,round:round,answer:/.test(app)
  ],
  [
    'next question starts a distinct round',
    /set\('game:choice',\{q:\(cur\.q\+1\)%choices\.length,round:rid\(\),at:Date\.now\(\)\}\)/.test(app)
  ]
];

for (const [label, ok] of choiceChecks) {
  if (ok) pass(label);
  else fail.push('Regression check failed: ' + label);
}

// Mobile input continuity, browser notification opt-in and memory-game flow.
const uxChecks = [
  [
    'input focus and selection preservation are implemented',
    app.includes('Keep mobile input focus') &&
    app.includes('setSelectionRange')
  ],
  [
    'live relationship counter is present',
    app.includes('function updateLiveCounter()') &&
    app.includes('setInterval(updateLiveCounter,1000)')
  ],
  [
    'browser notifications require explicit permission',
    app.includes('Notification.requestPermission()') &&
    app.includes("Notification.permission==='granted'")
  ],
  [
    'memory mismatches auto-hide after a short delay',
    app.includes('memoryFlipTimer=setTimeout') &&
    app.includes('latest.open=[]')
  ]
];

for (const [label, ok] of uxChecks) {
  if (ok) pass(label);
  else fail.push('UX regression check failed: ' + label);
}

// Chat experience and Worker safety regression checks.
const chatChecks = [
  [
    'unread badge is present in navigation',
    app.includes('chat-unread')
  ],
  [
    'read markers are isolated per role',
    app.includes("readKey='chat:read:'+role") &&
    app.includes("I['chat:read:'+role]")
  ],
  [
    'incoming messages can trigger in-app alerts',
    app.includes('function notifyIncoming(r)') &&
    app.includes("toast('💌 پیام تازه‌ای از پارتنرت داری.')")
  ],
  [
    'chat displays last partner activity',
    app.includes('آخرین فعالیت پارتنر')
  ],
  [
    'poll checks new messages before merging',
    /api\('GET'\)\.then\(function\(r\)\{notifyIncoming\(r\);if\(merge\(r\)/.test(app)
  ]
];

for (const [label, ok] of chatChecks) {
  if (ok) pass(label);
  else fail.push('Regression check failed: ' + label);
}

const workerChecks = [
  [
    'Worker requires an authorized role for shared documents',
    worker.includes("if(!role)return J({error:'برای دیدن این فضا باید وارد حساب خود شوید'},401);")
  ],
  [
    'Worker limits item, document and key counts',
    worker.includes('MAX_ITEM=300000, MAX_DOC=4500000, MAX_KEYS=5000') &&
    worker.includes('(:[A-Za-z0-9_-]{1,40}){1,3}') &&
    worker.includes('JSON.stringify(v).length>MAX_ITEM') &&
    worker.includes('Object.keys(doc.items).length>MAX_KEYS') &&
    worker.includes('out.length>MAX_DOC')
  ],
  [
    'Worker caps changes per request',
    worker.includes('ks.length>300')
  ],
  [
    'Worker caps request body size',
    worker.includes('txt.length>2e6')
  ]
];

for (const [label, ok] of workerChecks) {
  if (ok) pass(label);
  else fail.push('Security regression check failed: ' + label);
}

// Explicit checks for known deployment/security boundaries.
const deploymentChecks = [
  [
    'Worker rejects requests from unapproved origins',
    worker.includes("if(origin!==env.ORIGIN)return J({error:'دامنه مجاز نیست'},403)")
  ],
  [
    'sessions are stored with a finite expiration',
    worker.includes('{expirationTtl:2592000}')
  ],
  [
    'time-capsule UI does not falsely claim server-side secrecy',
    app.includes('قفل فقط نمایشی است؛ هر کس به دستگاه یا فضای مشترک دسترسی داشته باشد می‌تواند متن را ببیند.')
  ],
  [
    'notification UI clearly discloses foreground-only behavior',
    app.includes('این گزینه اعلان پوش یا اعلان پس‌زمینه نیست.')
  ],
  [
    'image memories enforce a bounded data URL',
    app.includes('v.img.length<=180000') &&
    app.includes("img:typeof v.img==='string'")
  ]
];

for (const [label, ok] of deploymentChecks) {
  if (ok) pass(label);
  else fail.push('Deployment boundary check failed: ' + label);
}

// Chat search regression checks.
const chatSearchChecks = [
  ['chat has an accessible message search input', app.includes('id="chat-search-input"') && app.includes('for="chat-search-input"')],
  ['chat search filters visible messages and reports the result count', app.includes('function filterChat()') && app.includes('card.hidden=!match') && app.includes('chatSearchStatus')]
];
for (const [label, ok] of chatSearchChecks) { if (ok) pass(label); else fail.push('Chat search regression check failed: ' + label); }

// Chat copy-message regression check.
const chatCopyChecks = [
  ['chat messages offer a copy action with clipboard fallback', app.includes('data-chat-copy=') && app.includes('navigator.clipboard.writeText') && app.includes("document.execCommand('copy')") && app.includes('متن پیام کپی شد.')]
];
for (const [label, ok] of chatCopyChecks) { if (ok) pass(label); else fail.push('Chat copy regression check failed: ' + label); }

// Chat reply and saved-message regression checks.
const chatPolishChecks = [
  ['chat supports reply references between messages', app.includes('replyTo:replyTarget?replyTarget.id') && app.includes('m.v.replyTo?msgs.find')],
  ['chat supports per-user saved messages and favorites filter', app.includes('chat:fav:') && app.includes('chat-favorites-only') && app.includes('data-chat-favorite')],
  ['chat reply and favorite controls are styled', readFileSync(join(root, 'style.css'), 'utf8').includes('.chat-quoted') && readFileSync(join(root, 'style.css'), 'utf8').includes('.chat-reply-status')]
];
for (const [label, ok] of chatPolishChecks) {
  if (ok) pass(label);
  else fail.push('Chat polish regression check failed: ' + label);
}

// Chat draft and reaction regression checks.
const chatChecks = [
  [
    'chat drafts are saved locally and restored for the current space and role',
    app.includes('ourhome-chat-draft:') && app.includes('localStorage.setItem(draftKey') && app.includes('localStorage.getItem(draftKey')
  ],
  [
    'chat messages support independent heart reactions from both partners',
    app.includes('chat:reaction:'+"'+m.id+':a'") && app.includes('chat:reaction:'+"'+m.id+':b'") && app.includes('data-chat-react')
  ],
  [
    'chat draft is cleared after successful local send action',
    app.includes('localStorage.removeItem(draftKey)')
  ]
];

for (const [label, ok] of chatChecks) {
  if (ok) pass(label);
  else fail.push('Chat regression check failed: ' + label);
}

// Album capacity diagnostics regression checks.
const albumCapacityChecks = [
  [
    'album shows an estimated storage status and progress indicator',
    app.includes('id="albumStorageStatus"') && app.includes('id="albumStorageProgress"')
  ],
  [
    'album estimates embedded image data and warns before approaching the shared-document limit',
    app.includes('imageChars+=I[k].v.img.length') && app.includes('chars>3500000') && app.includes('chars/4500000*100')
  ],
  [
    'album clearly discloses local-only storage when shared space is not configured',
    app.includes('فضای مشترک فعال نیست؛ این عکس‌ها فقط روی همین دستگاه‌اند')
  ]
];

for (const [label, ok] of albumCapacityChecks) {
  if (ok) pass(label);
  else fail.push('Album capacity regression check failed: ' + label);
}

// Sync health and local-storage diagnostics regression checks.
const syncHealthChecks = [
  [
    'settings provides a manual sync retry action',
    app.includes('id="retry-sync"') && app.includes('flush();refreshHealth()')
  ],
  [
    'settings explains queued changes and offline state',
    app.includes('تغییر در انتظار ارسال است') && app.includes('آفلاین؛')
  ],
  [
    'storage diagnostics use the browser Storage estimate API when available',
    app.includes('navigator.storage.estimate') && app.includes('id="storage-health"')
  ]
];

for (const [label, ok] of syncHealthChecks) {
  if (ok) pass(label);
  else fail.push('Sync health regression check failed: ' + label);
}

// Backup restore regression checks: bounded, validated and merge-only.
const backupChecks = [
  [
    'backup restore UI is available in settings',
    app.includes('id="import-backup-file"') && app.includes('id="import-backup"')
  ],
  [
    'backup restore validates format and version before applying data',
    app.includes("payload.format!=='ourhome-backup'") && app.includes('payload.version!==1')
  ],
  [
    'backup restore enforces file, entry-count and item-size limits',
    app.includes('file.size>5*1024*1024') && app.includes('entries.length>5000') && app.includes('JSON.stringify(item).length<=300000')
  ],
  [
    'backup restore merges data and queues shared sync instead of clearing current data',
    app.includes('اطلاعات فعلی حذف نمی‌شود') && app.includes('dirty[k]=1') && app.includes('sched()')
  ]
];

for (const [label, ok] of backupChecks) {
  if (ok) pass(label);
  else fail.push('Backup regression check failed: ' + label);
}

// Global responsive and accessibility visual regression checks.
const visualChecks = [
  ['global styles prevent horizontal overflow and improve mobile form targets', style.includes('overflow-x:clip') && style.includes('min-height:44px') && style.includes('@media(max-width:420px)')],
  ['navigation unread badge remains hidden until populated', style.includes('.chat-unread[hidden]{display:none!important}')],
  ['reduced-motion preference is respected', style.includes('prefers-reduced-motion:reduce')]
];
for (const [label, ok] of visualChecks) {
  if (ok) pass(label);
  else fail.push('Visual regression check failed: ' + label);
}

// Final result.
if (fail.length) {
  console.error('\nSMOKE TEST FAILED\n- ' + fail.join('\n- '));
  process.exit(1);
}

console.log('\nSMOKE TEST PASSED');