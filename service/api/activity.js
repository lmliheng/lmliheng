/** /api/activity —— 「最近在做什么」卡片（SVG，实时） */
const { profile } = require('../lib/github');
const { activitySvg } = require('../lib/activity');

const THEMES = new Set(['light', 'dark', 'auto']);
const BOX = (msg) =>
  '<svg xmlns="http://www.w3.org/2000/svg" width="860" height="60"><rect x="0.5" y="0.5" width="859" height="59" rx="10" ' +
  'fill="#ffffff" stroke="#d0d7de"/><text x="20" y="34" font-family="sans-serif" font-size="12" fill="#8b949e">' +
  msg.replace(/[<>&]/g, '') +
  '</text></svg>';

module.exports = async (req, res) => {
  const q = req.query || {};
  const theme = THEMES.has(String(q.theme)) ? String(q.theme) : 'auto';
  const login = String(q.user || process.env.PROFILE_USER || 'lmliheng').replace(/[^A-Za-z0-9-]/g, '');
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  try {
    if (!token) throw new Error('服务缺少 GH_TOKEN');
    const data = await profile(login, token);
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
    res.status(200).end(activitySvg(data, theme));
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).end(BOX('最近活跃数据暂时取不到：' + (e && e.message ? e.message : 'unknown')));
  }
};
