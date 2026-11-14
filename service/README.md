# profile-cards · 主页 README 的两张卡片

自己部署在 Vercel 的一个小服务，取代原来的两套第三方方案：

| 卡片 | 原来 | 现在 |
| --- | --- | --- |
| 最近在做什么 | `scripts/update_readme.py` 每天跑一次 Actions，把 markdown 表格重新生成一遍（内容最旧能差一天） | `/api/activity` 请求时现算 |
| 贡献图 | `yoshi389111/github-profile-3d-contrib` 生成 SVG 推到 `output-3d-contrib` 分支 | `/api/contrib` 请求时现画 3D 等距柱状图 |

## 接口

| 接口 | 说明 |
| --- | --- |
| `GET /api/activity?user=lmliheng` | 最近活跃的 3 个仓库、各自默认分支最新提交、相对时间，右上角是过去 7 天的汇总 |
| `GET /api/contrib?user=lmliheng` | 过去 53 周 × 7 天的 3D 贡献图，左侧是总数，右下是色阶图例 |

两个接口都返回 `image/svg+xml`：

- 深浅色由 SVG 内部的 `prefers-color-scheme` 切换，一个 URL 就自适应；也可以用 `?theme=light|dark` 强制。
- 缓存 `max-age=60, s-maxage=300, stale-while-revalidate=86400`，再叠加进程内 5 分钟缓存，所以刷新很快，也不会打爆 GraphQL 配额。
- 载入时有 CSS 动画：卡片逐行滑入，贡献图按周次逐列升起。动效在 `<img>` 里也会播（Chromium/Firefox/Safari）。

## 数据来源

一次 GraphQL 请求取齐：仓库列表（按最近推送排序）、每个仓库默认分支的最新提交、过去一年贡献日历。

需要环境变量 `GH_TOKEN`（只读就够的 PAT）。没有 token 时接口会返回一张说明文字的小卡片，而不是让 README 出现碎图标。

## 部署

```bash
VERCEL_TOKEN=xxx VERCEL_PROJECT=profile-cards node scripts/deploy.js
```

走 Vercel 的 Deployments API，不依赖 Vercel CLI：每次是一个新的不可变部署，项目生产域名自动指过去。
`.github/workflows/deploy-service.yml` 在 `service/**` 有推送时自动跑同一条命令，并在部署后 curl 两个接口校验内容。

## 本地预览

```bash
GH_TOKEN=xxx node dev/render.js    # 把四种组合落到 dev/out/*.svg
```

然后把 `dev/out/*.svg` 拖进浏览器，或 `python3 -m http.server` 起一个静态服务看。
