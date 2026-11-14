/**
 * 3D 等距贡献图：用 GitHub 的贡献日历画 53 周 × 7 天的立体柱，
 * 每根柱子三个可见面（顶面 + 右前侧面 + 左前侧面），按深度从后往前画。
 * 载入时按周次逐列升起（CSS 动画）；深浅色用 SVG 内的 prefers-color-scheme 切换，
 * 也支持 ?theme=light|dark 强制。
 */

const { esc, svgOpen, THEMES } = require('./svg');

const CELL = 13;
const STEP_X = CELL * 0.866; // 每周在屏幕上的水平位移
const STEP_Y = CELL * 0.46; // 每周/每天在屏幕上的垂直位移
const BAR_MAX = 52;
const BAR_MIN = 1.6;
const PAD_X = 24;
const HEAD = 86;

const shade = (hex, amount) => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((n & 255) * (1 - amount)));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
};

const level = (count, tiers) => {
  if (!count) return 0;
  if (count <= tiers[0]) return 1;
  if (count <= tiers[1]) return 2;
  if (count <= tiers[2]) return 3;
  return 4;
};

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

/** 一套配色的 15 个类：顶面 p、右前 q、左前 r，各 5 档 */
const paletteRules = (t) =>
  t.levels
    .map((c, i) => `.p${i}{fill:${c}}.q${i}{fill:${shade(c, t.sideDark)}}.r${i}{fill:${shade(c, t.sideDark * 1.7)}}`)
    .join('');

const contribSvg = (data, theme, opts) => {
  const o = opts || {};
  const weeks = data.contributions.weeks;
  const days = weeks.flat();
  const total = data.contributions.total;
  const counts = days.map((d) => d.count).filter((c) => c > 0).sort((a, b) => a - b);
  // 按分位数分档、按 p75 当满格：每天都提交的人也能看出高低差
  const quantile = (p) => (counts.length ? counts[Math.min(counts.length - 1, Math.floor(p * (counts.length - 1)))] : 1);
  const tiers = [quantile(0.35), quantile(0.65), quantile(0.88)];
  const full = Math.max(1, tiers[2]);
  const cutoff = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const weekCommits = days.filter((d) => d.date >= cutoff).reduce((s, d) => s + d.count, 0);

  const W = Math.round(PAD_X * 2 + weeks.length * STEP_X + 7 * STEP_X);
  const baseY = HEAD + 52;
  const H = Math.round(baseY + (weeks.length + 6) * STEP_Y + 104);

  const px = (w, d) => PAD_X + 6 * STEP_X + (w - d) * STEP_X;
  const py = (w, d) => baseY + (w + d) * STEP_Y;

  const cells = [];
  weeks.forEach((week, w) => {
    week.forEach((day, d) => {
      const h = day.count ? BAR_MIN + (BAR_MAX - BAR_MIN) * Math.min(1, day.count / full) : BAR_MIN * 0.6;
      cells.push({
        w,
        d,
        x: px(w, d),
        y: py(w, d),
        h,
        count: day.count,
        depth: w + d,
      });
    });
  });
  cells.sort((a, b) => a.depth - b.depth || a.w - b.w);

  const body = [];
  const sx = STEP_X.toFixed(1);
  for (const c of cells) {
    const lv = level(c.count, tiers);
    const x = c.x.toFixed(1);
    const yTop = (c.y - c.h).toFixed(1);
    const yBase = c.y.toFixed(1);
    const h = c.h.toFixed(1);
    const delay = (0.02 + (c.w / weeks.length) * 0.62 + c.d * 0.012).toFixed(3);
    body.push(
      `<g style="animation:rise .46s cubic-bezier(.22,.8,.28,1) both;animation-delay:${delay}s">` +
        `<path class="p${lv}" d="M${x} ${yTop}l${sx} ${STEP_Y}l-${sx} ${STEP_Y}l-${sx} -${STEP_Y}Z"/>` +
        `<path class="q${lv}" d="M${x} ${yTop}l${sx} ${STEP_Y}v${h}l-${sx} -${STEP_Y}Z"/>` +
        `<path class="r${lv}" d="M${x} ${yTop}l-${sx} ${STEP_Y}v${h}l${sx} -${STEP_Y}Z"/>` +
        '</g>'
    );
  }

  // 月份标签：每月第一周，标在最后面一排的上方
  const labels = [];
  let last = '';
  weeks.forEach((week, w) => {
    const month = week[0].date.slice(0, 7);
    if (month === last) return;
    last = month;
    labels.push(
      `<text x="${px(w, 0).toFixed(0)}" y="${(py(w, 0) - BAR_MAX - 14).toFixed(0)}" class="k-faint" font-size="10.5" text-anchor="middle">${MONTHS[Number(week[0].date.slice(5, 7)) - 1]}</text>`
    );
  });

  const legendY = H - 26;
  const legendX = W - PAD_X - 5 * 15 - 44;
  const legend = [0, 1, 2, 3, 4]
    .map((i) => `<rect x="${legendX + i * 15}" y="${legendY - 8}" width="11" height="11" rx="2" class="p${i}"/>`)
    .join('');
  const firstDay = days[0] ? days[0].date.slice(0, 7) : '';
  const lastDay = days[days.length - 1] ? days[days.length - 1].date.slice(0, 7) : '';

  return `${svgOpen(W, H, theme)}
<style>
  ${paletteRules(theme === 'dark' ? THEMES.dark : THEMES.light)}
  ${
    theme === 'dark' || theme === 'light'
      ? ''
      : '@media (prefers-color-scheme: dark){' + paletteRules(THEMES.dark) + '}'
  }
  @keyframes rise{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" class="k-bg k-border" stroke-width="1"/>
<g style="animation:fadeIn .5s ease both">
  <text x="${PAD_X}" y="30" class="k-fg" font-size="13.5" font-weight="600" letter-spacing=".3">贡献图</text>
  <text x="${W - PAD_X}" y="30" class="k-faint" font-size="11.5" text-anchor="end">过去一年 ${total.toLocaleString('en-US')} 次贡献 · ${firstDay} → ${lastDay}</text>
</g>
${labels.join('')}
${body.join('')}
<g style="animation:fadeIn .6s ease both;animation-delay:.75s">
  <text x="${PAD_X}" y="${H - 66}" class="k-fg" font-size="27" font-weight="600" letter-spacing="-.5">${total.toLocaleString('en-US')}</text>
  <text x="${PAD_X}" y="${H - 44}" class="k-sub" font-size="11.5">过去一年贡献 · ${weekCommits} 次是最近 7 天</text>
  <text x="${PAD_X}" y="${H - 24}" class="k-faint" font-size="10.5">github.com/${esc(o.login || '')} · 数据实时取自 GitHub</text>
  <text x="${legendX - 10}" y="${legendY - 2}" class="k-faint" font-size="10.5" text-anchor="end">少</text>
  ${legend}
  <text x="${legendX + 5 * 15 + 4}" y="${legendY - 2}" class="k-faint" font-size="10.5">多</text>
</g>
</svg>`;
};

module.exports = { contribSvg };
