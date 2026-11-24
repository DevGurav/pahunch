/**
 * Minimal robots.txt matcher, used only to *record* whether a task URL is disallowed.
 * We load a fixed list of task pages and never crawl, so the answer does not stop an audit
 * (docs/decisions/0005-scanning-rules.md). Matching follows RFC 9309: the group for our
 * user-agent token if one exists, else the `*` group; longest matching rule wins; on a tie,
 * Allow wins. Supports `*` and the `$` end anchor.
 */

export interface RobotsMatch {
  disallowed: boolean;
  /** The rule that decided it, e.g. "Disallow: /admin". */
  rule?: string;
}

interface Rule {
  allow: boolean;
  pattern: string;
}

interface Group {
  agents: string[];
  rules: Rule[];
}

function parseGroups(robotsTxt: string): Group[] {
  const groups: Group[] = [];
  let current: Group | undefined;
  let lastWasAgent = false;

  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((key === 'allow' || key === 'disallow') && current) {
      current.rules.push({ allow: key === 'allow', pattern: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  return groups;
}

function toRegExp(pattern: string): RegExp {
  const anchored = pattern.endsWith('$');
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${body}${anchored ? '$' : ''}`);
}

export function matchRobots(robotsTxt: string, pathAndQuery: string, agentToken: string): RobotsMatch {
  const groups = parseGroups(robotsTxt);
  const token = agentToken.toLowerCase();
  const own = groups.filter((g) => g.agents.some((a) => a !== '*' && token.includes(a)));
  const applicable = own.length > 0 ? own : groups.filter((g) => g.agents.includes('*'));
  const rules = applicable.flatMap((g) => g.rules).filter((r) => r.pattern !== '');

  let best: Rule | undefined;
  for (const rule of rules) {
    if (!toRegExp(rule.pattern).test(pathAndQuery)) continue;
    if (
      !best ||
      rule.pattern.length > best.pattern.length ||
      (rule.pattern.length === best.pattern.length && rule.allow && !best.allow)
    ) {
      best = rule;
    }
  }

  if (!best) return { disallowed: false };
  return { disallowed: !best.allow, rule: `${best.allow ? 'Allow' : 'Disallow'}: ${best.pattern}` };
}
