/**
 * 「最近在做什么」卡片：把 README 里那张 markdown 表格换成实时渲染的 SVG。
 * 三个仓库一行一个：语言点 + 仓库名 + 最新提交 + 相对时间，右侧是过去 7 天的汇总。
 */

const { esc, clip, ago, svgOpen } = require('./svg');

const W = 860;
const PAD = 22;
const ROW_H = 58;
const TOP = 54;
const ROWS = 3;

const langDot = (repo) => {
  const color = (repo.language && repo.language.color) || '#8b949e';
  return `<circle cx="${PAD + 4}" cy="${0}" r="4.5" fill="${esc(color)}"/>`;
};

const activitySvg = (data, theme) => {
  const now = Date.now();
  const repos = data.repos
    .filter((r) => r.name.toLowerCase() !== String(data.login).toLowerCase())
    .slice(0, ROWS);

  const weekCommits = (() => {
    const cutoff = new Date(now - 6 * 86400000).toISOString().slice(0, 10);
    return data.contributions.weeks
      .flat()
      .filter((d) => d.date >= cutoff)
      .reduce((sum, d) => sum + d.count, 0);
  })();
  const activeRepos = data.repos.filter((r) => r.active).length;

  const H = TOP + repos.length * ROW_H + 34;
  const chipW = 96;
  const textRight = W - PAD - chipW - 14;
  const textWidth = textRight - (PAD + 18);

  const rows = repos
    .map((repo, i) => {
      const y = TOP + i * ROW_H;
      const when = repo.commit && repo.commit.date ? ago(repo.commit.date, now) : ago(repo.pushedAt, now);
      const title = repo.commit ? clip(repo.commit.title, 72) : '暂无提交';
      return `
  <g class="row" style="animation:rowIn .5s cubic-bezier(.22,.8,.28,1) both;animation-delay:${120 + i * 90}ms">
    ${langDot(repo).replace('cy="0"', `cy="${y + 17}"`)}
    <text x="${PAD + 18}" y="${y + 17}" class="k-fg" font-size="15" font-weight="600">${esc(clip(repo.name, 26))}</text>
    <text x="${PAD + 18}" y="${y + 38}" class="k-mono" font-size="12" clip-path="url(#rowClip)">${esc(title)}</text>
    <rect x="${W - PAD - chipW}" y="${y + 6}" width="${chipW}" height="22" rx="11" class="k-card k-card-border" stroke-width="1"/>
    <text x="${W - PAD - chipW / 2}" y="${y + 17.5}" class="k-sub" font-size="11.5" text-anchor="middle">${esc(when)}</text>
  </g>`;
    })
    .join('');

  return `${svgOpen(W, H, theme)}
<style>
  @keyframes rowIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}
  .row,.head,.foot{will-change:transform,opacity}
</style>
<defs><clipPath id="rowClip"><rect x="${PAD + 18}" y="0" width="${textWidth}" height="${H}"/></clipPath></defs>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" class="k-bg k-border" stroke-width="1"/>
<g class="head" style="animation:fadeIn .5s ease both">
  <circle cx="${PAD + 6}" cy="26" r="3.5" fill="#3fb950" style="animation:pulse 2.4s ease-in-out infinite"/>
  <text x="${PAD + 18}" y="26" class="k-fg" font-size="13" font-weight="600" letter-spacing=".3">最近在做什么</text>
  <text x="${W - PAD}" y="26" class="k-faint" font-size="11.5" text-anchor="end">过去 7 天 · ${activeRepos} 个仓库 · ${weekCommits} 次提交</text>
  <line x1="${PAD}" y1="${TOP - 14}" x2="${W - PAD}" y2="${TOP - 14}" class="k-border" stroke-width="1" opacity=".7"/>
</g>
${rows}
<g class="foot" style="animation:fadeIn .6s ease both;animation-delay:.45s">
  <text x="${PAD}" y="${H - 15}" class="k-faint" font-size="10.5">${esc(data.login)} · 数据实时取自 GitHub · ${new Date(now).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }).replace(/\//g, '-')}</text>
</g>
</svg>`;
};

module.exports = { activitySvg };
