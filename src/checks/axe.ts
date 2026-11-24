import AxeBuilder from '@axe-core/playwright';
import type { Page } from 'playwright';
import { wcagFromAxeTags } from '../rules.ts';
import type { CheckResult, Finding } from '../types.ts';

export interface AxeNode {
  target: string;
  html: string;
  failureSummary?: string;
}

export interface AxeRuleResult {
  id: string;
  impact: string | null;
  help: string;
  helpUrl: string;
  tags: string[];
  nodeCount: number;
  /** First ten nodes only, to keep results small. */
  nodes: AxeNode[];
}

export interface AxeEvidence {
  version: string;
  violations: AxeRuleResult[];
  /** axe couldn't decide these ("needs review"). Kept apart from violations, never counted. */
  incomplete: AxeRuleResult[];
  passes: number;
}

export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

interface RawResult {
  id: string;
  impact?: string | null;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: Array<{ target: unknown; html: string; failureSummary?: string }>;
}

function trim(result: RawResult): AxeRuleResult {
  return {
    id: result.id,
    impact: result.impact ?? null,
    help: result.help,
    helpUrl: result.helpUrl,
    tags: result.tags,
    nodeCount: result.nodes.length,
    nodes: result.nodes.slice(0, 10).map((n) => ({
      target: (Array.isArray(n.target) ? n.target.flat(3) : [n.target]).join(' >> '),
      html: n.html.replace(/\s+/g, ' ').slice(0, 300),
      ...(n.failureSummary ? { failureSummary: n.failureSummary.slice(0, 400) } : {}),
    })),
  };
}

/** Standard WCAG 2.1 A/AA rules. axe findings top out at "barrier": axe can't tell what's on the task path. */
export async function checkAxe(page: Page): Promise<CheckResult<AxeEvidence>> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).options({ resultTypes: ['violations', 'incomplete'] }).analyze();

  const violations = (results.violations as RawResult[]).map(trim);
  const findings: Finding[] = violations.map((v) => {
    const first = v.nodes[0];
    return {
      check: 'axe',
      rule: `axe/${v.id}`,
      severity: v.impact === 'critical' || v.impact === 'serious' ? 'barrier' : 'info',
      wcag: wcagFromAxeTags(v.tags),
      summary: `${v.help} (${v.nodeCount} element${v.nodeCount === 1 ? '' : 's'}).`,
      ...(first ? { target: first.target, snippet: first.html } : {}),
      details: { impact: v.impact, helpUrl: v.helpUrl, nodes: v.nodes.slice(0, 5) },
    };
  });

  return {
    findings,
    evidence: {
      version: results.testEngine.version,
      violations,
      incomplete: (results.incomplete as RawResult[]).map(trim),
      passes: results.passes.length,
    },
  };
}
