#!/usr/bin/env node
/**
 * 把 service/ 目录部署到 Vercel（Deployments API，不需要 Vercel CLI）。
 * 用法：VERCEL_TOKEN=xxx VERCEL_PROJECT=profile-cards node service/scripts/deploy.js
 * 每次是一个新的不可变部署，项目生产域名自动指过去，所以 URL 固定、内容跟着提交更新。
 */
const fs = require('fs');
const path = require('path');

const API = 'https://api.vercel.com';
const TOKEN = process.env.VERCEL_TOKEN;
const NAME = process.env.VERCEL_PROJECT || 'profile-cards';
const ROOT = path.resolve(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', 'dev', 'out', '.vercel']);
const TEXT = new Set(['.js', '.html', '.json', '.md', '.css', '.txt']);

if (!TOKEN) {
  console.error('缺少 VERCEL_TOKEN');
  process.exit(1);
}

const walk = (dir, base = '') => {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name) || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    const rel = base ? base + '/' + entry.name : entry.name;
    if (entry.isDirectory()) out.push(...walk(full, rel));
    else if (!entry.name.endsWith('.png')) out.push({ file: rel, buf: fs.readFileSync(full) });
  }
  return out;
};

const call = async (p, init = {}) => {
  const res = await fetch(API + p, {
    ...init,
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error((init.method || 'GET') + ' ' + p + ' -> ' + res.status + ': ' + text.slice(0, 300));
  return text ? JSON.parse(text) : {};
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const files = walk(ROOT);
  console.log('部署 ' + files.length + ' 个文件到 ' + NAME + '：' + files.map((f) => f.file).join(', '));

  const dep = await call('/v13/deployments', {
    method: 'POST',
    body: JSON.stringify({
      name: NAME,
      project: NAME,
      target: 'production',
      files: files.map((f) => ({
        file: f.file,
        data: f.buf.toString('base64'),
        encoding: 'base64',
      })),
      projectSettings: { framework: null },
    }),
  });
  console.log('  deployment ' + dep.id + ' ' + dep.url);

  let state = dep.readyState;
  for (let i = 0; i < 60 && !['READY', 'ERROR', 'CANCELED'].includes(state); i++) {
    await sleep(4000);
    const cur = await call('/v13/deployments/' + dep.id);
    if (cur.readyState !== state) console.log('  ' + cur.readyState);
    state = cur.readyState;
  }
  if (state !== 'READY') throw new Error('部署未完成，最终状态 ' + state);

  const project = await call('/v9/projects/' + NAME);
  const aliases = ((project.targets || {}).production || {}).alias || [];
  const domain = aliases.map((a) => (typeof a === 'string' ? a : a.domain)).find((d) => d && d.endsWith('.vercel.app'));
  const base = 'https://' + (domain || NAME + '.vercel.app');
  console.log('  页面      ' + base + '/');
  console.log('  活跃卡片  ' + base + '/api/activity');
  console.log('  贡献图    ' + base + '/api/contrib');
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
