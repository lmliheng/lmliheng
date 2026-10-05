#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成 GitHub 主页 readme.md（lmliheng/lmliheng）。

· 所有版式与文案都在本文件里，改版请改这里（直接手改 readme.md 会在下次运行被覆盖）。
· 数据全部来自 GitHub REST API，不依赖第三方动态卡片服务；外部图片只有 shields.io 徽章、访问量徽章，
  以及 output-3d-contrib 分支里的 3D 贡献图（由 .github/workflows/profile-3d-contrib.yml 每天生成）。
· 页脚的「最后更新」时间每次都会刷新，所以正常情况下每天恰好产生一次提交。

用法:
    GITHUB_TOKEN=xxx python3 scripts/update_readme.py              # 生成 readme.md
    GITHUB_TOKEN=xxx python3 scripts/update_readme.py --dry-run    # 只打印到终端
"""

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

USER = "lmliheng"
TZ = timezone(timedelta(hours=8))          # 展示用北京时间
RECENT_REPOS = 3                           # 「最近在做什么」展示几个仓库
WEEK_SCAN = 10                             # 统计 7 天提交量时扫描多少个仓库
STALE_DAYS = 60                            # 超过这么多天没动的仓库不展示
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "readme.md")

SELF_REPO = USER + "/" + USER
EMAIL = "0110230306@csu.edu.cn"

# ---------------------------------------------------------------- 版式配置 ----

# 访问量徽章（第三方服务，与 Furinar 主页同款）。
VIEWS_BADGE = "https://views.whatilearened.today/views/github/%s/%s.svg" % (USER, USER)

# 3D 贡献图由 .github/workflows/profile-3d-contrib.yml 推到 output-3d-contrib 分支。
CONTRIB_BASE = "https://raw.githubusercontent.com/%s/%s/output-3d-contrib" % (USER, USER)

# (名称, 链接, 徽章图片)
CONTACT = [
    ("邮件", "mailto:" + EMAIL, "https://img.shields.io/badge/-%s-EA4335?style=flat-square&logo=gmail&logoColor=white" % urllib.parse.quote(EMAIL)),
    ("npm", "https://www.npmjs.com/~" + USER, "https://img.shields.io/badge/npm-CB3837?style=flat-square&logo=npm&logoColor=white"),
    ("LeetCode", "https://leetcode.cn/u/festive-keplerug8/", "https://img.shields.io/badge/-LeetCode-FFA116?style=flat-square&logo=LeetCode&logoColor=black"),
    ("PayPal", "https://paypal.me/" + USER, "https://img.shields.io/badge/PayPal-003087?style=flat-square&logo=paypal&logoColor=white"),
]

LANG_STYLE = {
    "TypeScript": ("3178C6", "typescript", "white"),
    "Python": ("3776AB", "python", "white"),
    "Java": ("ED8B00", "openjdk", "white"),
    "Go": ("00ADD8", "go", "white"),
    "C": ("A8B9CC", "c", "black"),
    "JavaScript": ("F7DF1E", "javascript", "black"),
    "Vue": ("4FC08D", "vuedotjs", "white"),
    "HTML": ("E34F26", "html5", "white"),
    "Dockerfile": ("2496ED", "docker", "white"),
    "MATLAB": ("0076A8", "mathworks", "white"),
    "Shell": ("4EAA25", "gnubash", "white"),
    "C++": ("00599C", "cplusplus", "white"),
}

# ------------------------------------------------------------------ 取数据 ----


def api(path):
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if not token:
        sys.exit("缺少 GITHUB_TOKEN 环境变量")
    req = urllib.request.Request(
        "https://api.github.com" + path,
        headers={
            "Authorization": "Bearer " + token,
            "Accept": "application/vnd.github+json",
            "User-Agent": USER + "-profile-readme",
        },
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (403, 429) and attempt < 2:
                time.sleep(5)
                continue
            raise
    return None


def owned_repos():
    """本人的仓库列表（按最近推送倒序）。

    带 PAT 时走 /user/repos（能拿到私有仓库，但私有仓库不会被写进公开的 README）；
    在 GitHub Actions 里 GITHUB_TOKEN 不是用户身份，/user/repos 会 401/403，改用公开接口。
    """
    try:
        return api("/user/repos?affiliation=owner&sort=pushed&per_page=100")
    except urllib.error.HTTPError as e:
        if e.code not in (401, 403):
            raise
    return api("/users/%s/repos?sort=pushed&per_page=100" % USER)


def parse_ts(s):
    return datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


def latest_commit(full_name):
    data = api("/repos/%s/commits?per_page=1" % full_name)
    if not data:
        return None
    c = data[0]
    return {
        "message": (c["commit"]["message"].splitlines() or [""])[0],
        "date": parse_ts(c["commit"]["author"]["date"]),
    }


def weekly_commits(full_name, since):
    data = api("/repos/%s/commits?since=%s&author=%s&per_page=100" % (full_name, since, USER))
    return len(data) if data else 0


def humanize(dt, now):
    days = int((now - dt).total_seconds() // 86400)
    if days <= 0:
        return "今天"
    if days == 1:
        return "昨天"
    if days < 30:
        return "%d 天前" % days
    if days < 365:
        return "%d 个月前" % (days // 30)
    return "%d 年前" % (days // 365)


# ---------------------------------------------------------------- 渲染 -------


def badge(label, color, logo, logo_color, style="for-the-badge"):
    return "https://img.shields.io/badge/%s-%s?style=%s&logo=%s&logoColor=%s" % (
        urllib.parse.quote(label), color, style, logo, logo_color)


def lang_badge(lang):
    label = lang or "Code"
    color, logo, lc = LANG_STYLE.get(lang, ("6e7681", "github", "white"))
    return "![%s](%s)" % (label, badge(label, color, logo, lc, "flat-square"))


def esc(msg, limit=72):
    for a, b in (("`", "'"), ("|", "\\|"), ("<", "&lt;"), (">", "&gt;")):
        msg = msg.replace(a, b)
    msg = msg.strip()
    return msg[: limit - 1].rstrip() + "…" if len(msg) > limit else msg


def render():
    now = datetime.now(timezone.utc)
    since = (now - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")

    owned = owned_repos()
    repos = [r for r in owned if not r["private"] and not r["fork"]]

    recent = []
    for r in repos:
        if r["full_name"].lower() == SELF_REPO.lower():
            continue
        if len(recent) >= RECENT_REPOS:
            break
        pushed = parse_ts(r["pushed_at"])
        if (now - pushed).days > STALE_DAYS:
            break
        commit = latest_commit(r["full_name"])
        recent.append({
            "name": r["name"],
            "url": r["html_url"],
            "lang": r["language"] or "",
            "when": humanize(commit["date"], now) if commit else humanize(pushed, now),
            "message": esc(commit["message"]) if commit else "—",
        })

    # 7 天提交量按最近活跃的若干个仓库统计（不止表格里那三个）
    scanned = [r for r in repos if r["full_name"].lower() != SELF_REPO.lower()][:WEEK_SCAN]
    week = [weekly_commits(r["full_name"], since) for r in scanned]
    week_total = sum(week)
    week_active = sum(1 for n in week if n)

    L = []
    a = L.append
    a("<!-- 该文件由 scripts/update_readme.py 自动生成，请勿直接编辑；改版请改脚本。 -->")
    a("")
    a("## Hi, I'm liheng 👋")
    a("")
    a('<img alt="访问量" src="%s" />' % VIEWS_BADGE)
    a("")
    a("#### 最近在做什么")
    a("")
    a("| 项目 | 最近一次提交 | 更新 |")
    a("| :-- | :-- | :-- |")
    for x in recent:
        a("| %s **[%s](%s)** | `%s` | %s |" % (lang_badge(x["lang"]), x["name"], x["url"], x["message"], x["when"]))
    a("")
    if week_total:
        a("<sub>过去 7 天：%d 个仓库 · %d 次提交</sub>" % (week_active, week_total))
        a("")
    a("#### 贡献图")
    a("")
    a("<picture>")
    a('  <source media="(prefers-color-scheme: dark)" srcset="%s/night.svg" />' % CONTRIB_BASE)
    a('  <source media="(prefers-color-scheme: light)" srcset="%s/day.svg" />' % CONTRIB_BASE)
    a('  <img alt="3D 贡献图" src="%s/day.svg" />' % CONTRIB_BASE)
    a("</picture>")
    a("")
    a("<sub>最后更新：%s（UTC+8）· 由 [scripts/update_readme.py](scripts/update_readme.py) 自动生成 · "
      "3D 贡献图由 [.github/workflows/profile-3d-contrib.yml](.github/workflows/profile-3d-contrib.yml) 每日生成</sub>"
      % now.astimezone(TZ).strftime("%Y-%m-%d %H:%M"))
    a("")
    return "\n".join(L)


def main():
    text = render()
    if "--dry-run" in sys.argv:
        print(text)
        return
    with open(OUT, "r", encoding="utf-8") as f:
        old = f.read()
    if old.strip() == text.strip():
        print("内容无变化，跳过写入")
        return
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(text)
    print("已生成 readme.md（%d 字节）" % len(text.encode("utf-8")))


if __name__ == "__main__":
    main()
