#!/usr/bin/env node
/* Publish "Living on the Moon" as a SUBDIRECTORY of the 42-apps hub Pages repo
   (42-apps/42-apps.github.io), served at 42-apps.github.io/moon/.
   Anonymous: signs a JWT with the claude-deploy app key -> short-lived install
   token -> shallow-clone hub -> drop moon/ -> add a homepage card -> commit as
   42-apps -> NORMAL push (never force; every other app subdir is preserved).

     GH_APP_KEY=<pem> node tools/deploy.cjs
*/
const fs = require('fs'); const crypto = require('crypto'); const https = require('https');
const { execFileSync } = require('child_process'); const path = require('path'); const os = require('os');

const APP_ID = process.env.GH_APP_ID || '4011402';
const KEY = process.env.GH_APP_KEY || path.join(os.homedir(), '.ssh', 'claude-deploy.pem');
const ORG = process.env.GH_ORG || '42-apps';
const HUB = '42-apps.github.io';
const SUB = 'moon';
const SRC = path.resolve(__dirname, '..');     // the app root

const CARD = `<a class="app" href="moon/"><div class="ic">🌕</div><h2>Living on the Moon</h2>`
  + `<p>A high-resolution 3D Moon you can zoom into, with every landing site &amp; landmark — `
  + `then build cities and hotels on it, and fly a Starship there from Earth in a realistic, `
  + `speed-up-able launch simulation.</p></a>`;

const SKIP = new Set(['.git', 'tools', '_dist', 'node_modules', '.claude']);

const b64 = b => Buffer.from(b).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
function jwt(){ const n=Math.floor(Date.now()/1000); const h=b64(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const p=b64(JSON.stringify({iat:n-60,exp:n+540,iss:APP_ID}));
  return `${h}.${p}.`+b64(crypto.createSign('RSA-SHA256').update(h+'.'+p).sign(fs.readFileSync(KEY,'utf8'))); }
function api(method,p,auth){ return new Promise((res,rej)=>{ const r=https.request({hostname:'api.github.com',path:p,method,
  headers:{Authorization:auth,Accept:'application/vnd.github+json','User-Agent':'deploy-moon','X-GitHub-Api-Version':'2022-11-28'}},
  x=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>{let j;try{j=JSON.parse(d)}catch{j=d} res({status:x.statusCode,json:j})})});
  r.on('error',rej); r.end(); }); }

(async () => {
  const insts = await api('GET','/app/installations',`Bearer ${jwt()}`);
  const inst = (insts.json||[]).find(i=>i.account&&i.account.login.toLowerCase()===ORG.toLowerCase());
  if (!inst) throw new Error('app not installed on '+ORG);
  const tok = await api('POST',`/app/installations/${inst.id}/access_tokens`,`Bearer ${jwt()}`);
  if (tok.status!==201) throw new Error('token failed: '+tok.status+' '+JSON.stringify(tok.json));
  const token = tok.json.token;
  console.log('auth: got installation token (bot)');

  const tmp = path.join(os.tmpdir(), 'hub-deploy-moon');
  fs.rmSync(tmp, { recursive: true, force: true });
  const authed = `https://x-access-token:${token}@github.com/${ORG}/${HUB}.git`;
  const clean  = `https://github.com/${ORG}/${HUB}.git`;
  execFileSync('git', ['clone','--depth','1',authed,tmp], { stdio:'inherit' });

  // drop the app into moon/ (excluding dev-only dirs)
  const dest = path.join(tmp, SUB);
  const existed = fs.existsSync(dest);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(SRC, dest, { recursive: true, filter: (src) => {
    const rel = path.relative(SRC, src);
    if (!rel) return true;
    const top = rel.split(path.sep)[0];
    if (SKIP.has(top)) return false;
    if (/^_shot_.*\.jpg$/.test(path.basename(src))) return false;
    return true;
  }});
  // belt-and-braces: never ship a nested .git (would commit moon/ as a gitlink)
  fs.rmSync(path.join(dest, '.git'), { recursive: true, force: true });
  console.log(`staged ${SUB}/ (${existed?'updated':'new'})`);

  // add homepage card if missing
  const idxPath = path.join(tmp, 'index.html');
  let idx = fs.readFileSync(idxPath, 'utf8');
  if (!/href="moon\/"/.test(idx)) {
    if (/<\/div>\s*<footer/.test(idx)) { idx = idx.replace(/<\/div>(\s*<footer)/, `${CARD}</div>$1`); }
    else { idx = idx.replace(/<\/body>/, `${CARD}</body>`); }
    fs.writeFileSync(idxPath, idx);
    console.log('index.html: added Living on the Moon card');
  } else { console.log('index.html: card already present'); }

  const g = (args, opts) => execFileSync('git', ['-C', tmp, ...args], { stdio:'pipe', ...opts });
  const ID = ['-c','user.name=42-apps','-c','user.email=42-apps@users.noreply.github.com'];
  const env = { ...process.env, GIT_COMMITTER_NAME:'42-apps', GIT_COMMITTER_EMAIL:'42-apps@users.noreply.github.com' };
  // clear any stale gitlink/index entry for moon/ before re-adding real files
  try { g(['rm','-r','--cached','--ignore-unmatch', SUB]); } catch {}
  g(['add', SUB, 'index.html']);
  const status = g(['status','--porcelain']).toString().trim();
  if (!status) { console.log('no changes — already up to date'); return; }
  g([...ID,'commit','-q','-m',`${existed?'Update':'Add'} Living on the Moon at /moon/`,'--author=42-apps <42-apps@users.noreply.github.com>'], { env });
  execFileSync('git', ['-C', tmp, 'push','origin','HEAD:main'], { stdio:'inherit' });   // NORMAL push, never --force
  g(['remote','set-url','origin',clean]);
  console.log(`\npush: done. live at https://${ORG}.github.io/${SUB}/ (allow ~1 min for Pages rebuild)`);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
