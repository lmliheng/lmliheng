/**
 * 贡献图（2D 版）：GitHub 那种周 × 天的热力格 + 底部数字面板。
 * 数字面板把「贡献 / 提交 / PR / 星标 / 仓库」分开写清楚，避免只有一个总数看不懂。
 */

const { esc, svgOpen, THEMES } = require('./svg');

const W = 868;
const PAD = 24;
const CELL = 12;
const GAP = 3;
const STEP = CELL + GAP;
const GRID_TOP = 58;
const LABEL_W = 26;

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const WEEKDAYS = { 1: '一', 3: '三', 5: '五' };

const LEVELS = {
  light: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
  dark: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
};

const levelRules = (levels) => levels.map((c, i) => `.l${i}{fill:${c}}`).join('');

const fmt = (n) => Number(n || 0).toLocaleString('en-US');

const contrib2dSvg = (data, theme, opts) => {
  const o = opts || {};
  const weeks = data.contributions.weeks;
  const days = weeks.flat();
  const total = data.contributions.total;
  const counts = days.map((d) => d.count).filter((c) => c > 0).sort((a, b) => a - b);
  const quantile = (p) => (counts.length ? counts[Math.min(counts.length - 1, Math.floor(p * (counts.length - 1)))] : 1);
  const tiers = [quantile(0.35), quantile(0.65), quantile(0.88)];
  const level = (c) => (c <= 0 ? 0 : c <= tiers[0] ? 1 : c <= tiers[1] ? 2 : c <= tiers[2] ? 3 : 4);

  const gx = PAD + LABEL_W;
  const gridBottom = GRID_TOP + 7 * STEP - GAP;

  // 月份标签：每月的第一周
  const labels = [];
  let last = '';
  weeks.forEach((week, w) => {
    const month = week[0].date.slice(0, 7);
    if (month === last) return;
    last = month;
    const x = gx + w * STEP;
    if (x > gx + 12) labels.push(`<text x="${x}" y="${GRID_TOP - 9}" class="k-faint" font-size="10.5">${MONTHS[Number(week[0].date.slice(5, 7)) - 1]}</text>`);
  });

  const weekdayLabels = Object.entries(WEEKDAYS)
    .map(([row, name]) => {
      const y = GRID_TOP + Number(row) * STEP + CELL / 2;
      return `<text x="${PAD + LABEL_W - 9}" y="${y}" class="k-sub" font-size="10" text-anchor="end">${name}</text>`;
    })
    .join('');

  const columns = weeks
    .map((week, w) => {
      const delay = (0.02 + (w / weeks.length) * 0.55).toFixed(3);
      const cells = week
        .map((day, d) => {
          const x = gx + w * STEP;
          const y = GRID_TOP + d * STEP;
          return `<rect class="l${level(day.count)}" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2.5"/>`;
        })
        .join('');
      return `<g style="animation:pop .42s cubic-bezier(.2,.8,.3,1) both;animation-delay:${delay}s">${cells}</g>`;
    })
    .join('');

  const legendY = gridBottom + 18;
  const legendX = W - PAD - 18 - 5 * 14;
  const legendCells = [0, 1, 2, 3, 4]
    .map((i) => `<rect class="l${i}" x="${legendX + i * 14}" y="${legendY - 9}" width="10" height="10" rx="2"/>`)
    .join('');

  const stats = [
    ['贡献', data.contributions.total, '总计'],
    ['提交', data.stats.commits, 'commit'],
    ['PR', data.stats.pullRequests, '拉取请求'],
    ['星标', data.stars, 'star'],
    ['仓库', data.repoCount, '公开'],
  ];
  const colW = (W - PAD * 2) / stats.length;
  const statY = legendY + 40;

  const statBlocks = stats
    .map(([label, value, note], i) => {
      const x = PAD + i * colW;
      return (
        `<text x="${x}" y="${statY}" class="k-fg" font-size="23" font-weight="600" letter-spacing="-.4">${fmt(value)}</text>` +
        `<text x="${x}" y="${statY + 21}" class="k-sub" font-size="11">${label}<tspan class="k-faint"> · ${note}</tspan></text>`
      );
    })
    .join('');

  const H = statY + 46;
  const range = days.length ? `${days[0].date.slice(0, 7)} → ${days[days.length - 1].date.slice(0, 7)}` : '';

  return `${svgOpen(W, H, theme)}
<style>
  ${levelRules(theme === 'dark' ? LEVELS.dark : LEVELS.light)}
  ${theme === 'dark' || theme === 'light' ? '' : '@media (prefers-color-scheme: dark){' + levelRules(LEVELS.dark) + '}'}
  @keyframes pop{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" class="k-bg k-border" stroke-width="1"/>
<g style="animation:fadeIn .45s ease both">
  <text x="${PAD}" y="27" class="k-fg" font-size="13.5" font-weight="600" letter-spacing=".3">贡献图</text>
  <text x="${W - PAD}" y="27" class="k-faint" font-size="11.5" text-anchor="end">${range} · 过去一年 ${fmt(total)} 次贡献</text>
  ${labels.join('')}
  ${weekdayLabels}
</g>
${columns}
<g style="animation:fadeIn .5s ease both;animation-delay:.6s">
  <text x="${legendX - 8}" y="${legendY - 1}" class="k-faint" font-size="10.5" text-anchor="end">少</text>
  ${legendCells}
  <text x="${W - PAD}" y="${legendY - 1}" class="k-faint" font-size="10.5">多</text>
</g>
<g style="animation:fadeIn .55s ease both;animation-delay:.72s">
  <line x1="${PAD}" y1="${legendY + 14}" x2="${W - PAD}" y2="${legendY + 14}" class="k-border" stroke-width="1" opacity=".65"/>
  ${statBlocks}
</g>
<text x="${PAD}" y="${H - 12}" class="k-faint" font-size="10">github.com/${esc(o.login || '')} · 贡献 = 提交 + PR + issue + 评审（GitHub 口径）· 请求时实时计算，缓存 5 分钟</text>
</svg>`;
};

module.exports = { contrib2dSvg };
