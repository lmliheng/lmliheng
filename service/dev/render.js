#!/usr/bin/env node
/** 本地预览：不开服务器，直接调两个 handler 把 SVG 落盘，再交给浏览器截图看效果 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

const fakeRes = (file) => {
  const state = { headers: {} };
  return {
    state,
    setHeader(k, v) {
      state.headers[k.toLowerCase()] = v;
    },
    status(code) {
      state.code = code;
      return this;
    },
    end(body) {
      fs.writeFileSync(file, body);
      console.log('  ' + path.basename(file) + '  ' + body.length + 'B  ' + JSON.stringify(state.headers));
      if (state.code && state.code !== 200) console.log('  ⚠ HTTP ' + state.code);
    },
  };
};

const cases = [
  ['api/activity.js', 'activity-light.svg', { user: 'lmliheng', theme: 'light' }],
  ['api/activity.js', 'activity-dark.svg', { user: 'lmliheng', theme: 'dark' }],
  ['api/activity.js', 'activity-auto.svg', { user: 'lmliheng' }],
  ['api/contrib.js', 'contrib-light.svg', { user: 'lmliheng', theme: 'light' }],
  ['api/contrib.js', 'contrib-dark.svg', { user: 'lmliheng', theme: 'dark' }],
  ['api/contrib.js', 'contrib-auto.svg', { user: 'lmliheng' }],
];

(async () => {
  for (const [mod, file, query] of cases) {
    const handler = require(path.join(__dirname, '..', mod));
    await handler({ query }, fakeRes(path.join(OUT, file)));
  }
})();
