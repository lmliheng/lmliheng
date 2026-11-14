/**
 * SVG 公共部件：主题配色、转义、相对时间、主题 CSS。
 *
 * 深浅色用 SVG 内部的 prefers-color-scheme 切换，一个 URL 就能自适应，
 * README 里不用写 <picture> 双份地址；?theme=light|dark 可强制覆盖。
 */

const THEMES = {
  light: {
    bg: '#ffffff',
    border: '#d0d7de',
    fg: '#1f2328',
    sub: '#656d76',
    faint: '#8b949e',
    chip: '#f6f8fa',
    chipBorder: '#d0d7de',
    mono: '#59636e',
    levels: ['#ebedf0', '#d8e887', '#8cc569', '#47a042', '#1d6a23'],
    sideDark: 0.22,
  },
  dark: {
    bg: '#0d1117',
    border: '#30363d',
    fg: '#e6edf3',
    sub: '#8b949e',
    faint: '#6e7681',
    chip: '#161b22',
    chipBorder: '#30363d',
    mono: '#9198a1',
    levels: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
    sideDark: 0.32,
  },
};

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** 截断文案，中文按字符数，结尾带省略号 */
const clip = (s, max) => {
  const str = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  if (str.length <= max) return str;
  return str.slice(0, max - 1).replace(/[\s,，、:：-]+$/, '') + '…';
};

/** 相对时间：刚刚 / 12 分钟前 / 3 小时前 / 2 天前 / 3 周前 / 4 个月前 */
const ago = (iso, now) => {
  const t = new Date(iso).getTime();
  const ref = now || Date.now();
  if (!Number.isFinite(t)) return '';
  const m = Math.max(0, Math.round((ref - t) / 60000));
  if (m < 2) return '刚刚';
  if (m < 60) return m + ' 分钟前';
  const h = Math.round(m / 60);
  if (h < 24) return h + ' 小时前';
  const d = Math.round(h / 24);
  if (d < 8) return d + ' 天前';
  const w = Math.round(d / 7);
  if (w < 6) return w + ' 周前';
  const mo = Math.round(d / 30);
  if (mo < 13) return mo + ' 个月前';
  return Math.round(d / 365) + ' 年前';
};

const rules = (t) =>
  [
    ['.k-bg', 'fill:' + t.bg],
    ['.k-card', 'fill:' + t.chip],
    ['.k-border', 'stroke:' + t.border],
    ['.k-card-border', 'stroke:' + t.chipBorder],
    ['.k-fg', 'fill:' + t.fg],
    ['.k-sub', 'fill:' + t.sub],
    ['.k-faint', 'fill:' + t.faint],
    ['.k-mono', 'fill:' + t.mono],
  ]
    .map(([k, v]) => k + '{' + v + '}')
    .join('');

const themeCss = (forced) => {
  if (forced === 'light') return rules(THEMES.light);
  if (forced === 'dark') return rules(THEMES.dark);
  return rules(THEMES.light) + '@media (prefers-color-scheme: dark){' + rules(THEMES.dark) + '}';
};

const palette = (forced) => (forced === 'dark' ? THEMES.dark : THEMES.light);

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans SC','PingFang SC','Microsoft YaHei',Helvetica,Arial,sans-serif";

const svgOpen = (w, h, forced) =>
  '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h +
  '" font-family="' + FONT + '" role="img"><style>' +
  themeCss(forced) +
  'text{dominant-baseline:middle}</style>';

module.exports = { THEMES, esc, clip, ago, themeCss, palette, svgOpen, FONT };
