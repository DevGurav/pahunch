import type { Finding, Verdict } from './types.ts';

/**
 * Turns a task's findings into one verdict. See docs/decisions/0004-verdicts-not-scores.md.
 *
 * A blocker wins over everything: if we can prove one wall, unchecked parts don't matter.
 * Otherwise, anything we could not check makes the verdict inconclusive, because the unchecked
 * part might hold a blocker. Only then do barriers or a clean run decide it.
 */
export function decideVerdict(findings: readonly Finding[], inconclusiveReasons: readonly string[]): Verdict {
  if (findings.some((f) => f.severity === 'blocker')) return 'blocked';
  if (inconclusiveReasons.length > 0) return 'inconclusive';
  if (findings.some((f) => f.severity === 'barrier')) return 'barriers';
  return 'no-blockers-found';
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  blocked: 'Blocked',
  inconclusive: 'Inconclusive',
  barriers: 'Barriers found',
  'no-blockers-found': 'No blockers found by automated checks',
};
