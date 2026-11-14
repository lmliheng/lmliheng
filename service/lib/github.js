/**
 * 一次 GraphQL 请求取齐两张卡片要用的数据：
 *   · 按最近推送排序的公开仓库（前 8 个）+ 各自默认分支的最新提交
 *   · 过去一年的贡献日历（按周分组，每天的次数）
 * 进程内缓存 5 分钟（配合 CDN 的 s-maxage），免得每次刷新都把配额打光。
 */

const ENDPOINT = 'https://api.github.com/graphql';
const TTL = 5 * 60 * 1000;
const cache = new Map();

const QUERY = `
query profile($login: String!, $from: DateTime!, $to: DateTime!, $since: GitTimestamp!) {
  user(login: $login) {
    login
    name
    repositories(
      first: 8
      privacy: PUBLIC
      ownerAffiliations: OWNER
      isFork: false
      orderBy: { field: PUSHED_AT, direction: DESC }
    ) {
      nodes {
        name
        url
        pushedAt
        isArchived
        primaryLanguage { name color }
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: 1) { nodes { messageHeadline committedDate } }
              recent: history(first: 1, since: $since) { nodes { committedDate } }
            }
          }
        }
      }
    }
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

const DAY = 24 * 60 * 60 * 1000;

/** GitHub 的 contributionsCollection 最多一年，这里取最近 53 周对齐到周日 */
const range = (now) => {
  const to = new Date(now);
  const from = new Date(to.getTime() - 364 * DAY);
  // 退到最近的周日，让日历保证是整周
  from.setUTCDate(from.getUTCDate() - from.getUTCDay());
  return { from: from.toISOString(), to: to.toISOString() };
};

async function fetchProfile(login, token) {
  const now = Date.now();
  const { from, to } = range(now);
  const since = new Date(now - 7 * DAY).toISOString();
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      'User-Agent': 'lmliheng-profile-service',
    },
    body: JSON.stringify({ query: QUERY, variables: { login, from, to, since } }),
  });
  if (!res.ok) {
    throw new Error('GraphQL ' + res.status + ': ' + (await res.text()).slice(0, 200));
  }
  const body = await res.json();
  if (body.errors) {
    throw new Error('GraphQL: ' + JSON.stringify(body.errors).slice(0, 300));
  }
  const user = body.data && body.data.user;
  if (!user) throw new Error('用户不存在：' + login);

  const repos = (user.repositories.nodes || []).map((r) => {
    const target = (r.defaultBranchRef && r.defaultBranchRef.target) || null;
    const head = target && target.history && target.history.nodes && target.history.nodes[0];
    const recent = target && target.recent && target.recent.nodes;
    return {
      name: r.name,
      url: r.url,
      pushedAt: r.pushedAt,
      archived: r.isArchived,
      active: !!(recent && recent.length),
      language: r.primaryLanguage,
      commit: head ? { title: head.messageHeadline, date: head.committedDate } : null,
    };
  });

  const calendar = user.contributionsCollection.contributionCalendar;
  return {
    login: user.login,
    name: user.name,
    fetchedAt: now,
    repos,
    commitsYear: user.contributionsCollection.totalCommitContributions,
    contributions: {
      total: calendar.totalContributions,
      weeks: calendar.weeks.map((w) => w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount }))),
    },
  };
}

async function profile(login, token) {
  const key = login.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  const data = await fetchProfile(login, token);
  cache.set(key, { at: Date.now(), data });
  return data;
}

module.exports = { profile, TTL };
