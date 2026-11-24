import type { APIRequestContext, Page } from 'playwright';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { finding } from '../rules.ts';
import type { CheckResult, Finding } from '../types.ts';

export interface PdfEvidence {
  url: string;
  status: number | null;
  bytes?: number;
  pages?: number;
  sampledPages?: number;
  textChars?: number;
  tagged?: boolean;
  result: 'text' | 'scanned' | 'not-pdf' | 'too-large' | 'error';
  error?: string;
}

export interface PdfOptions {
  /** At most this many PDFs per page. Default 5 (docs/decisions/0005-scanning-rules.md). */
  max?: number;
  /** Skip files larger than this. Default 15 MB. */
  maxBytes?: number;
  /** Called before each download, to keep to the audit's pacing. */
  pace?: () => Promise<void>;
}

/** Fewer text characters than this per sampled page means the PDF is a scan. */
export const SCANNED_CHARS_PER_PAGE = 25;
const SAMPLE_PAGES = 5;

/**
 * Reads text from the first pages and the "marked" (tagged) flag. Nothing is rendered and no
 * fonts are loaded. pdfjs-dist 6 no longer has the eval-based font path behind CVE-2024-4367
 * (its isEvalSupported option is gone), so there is no switch left to turn off.
 */
export async function analysePdf(bytes: Uint8Array): Promise<{ pages: number; sampledPages: number; textChars: number; tagged: boolean }> {
  const task = getDocument({ data: bytes.slice(), disableFontFace: true, useSystemFonts: false, verbosity: 0 });
  const doc = await task.promise;
  try {
    const sampledPages = Math.min(doc.numPages, SAMPLE_PAGES);
    let textChars = 0;
    for (let n = 1; n <= sampledPages; n++) {
      const content = await (await doc.getPage(n)).getTextContent();
      textChars += content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join('')
        .replace(/\s+/g, '').length;
    }
    const mark = (await doc.getMarkInfo()) as { Marked?: boolean } | null;
    return { pages: doc.numPages, sampledPages, textChars, tagged: mark?.Marked === true };
  } finally {
    await task.destroy();
  }
}

/** Runs in each frame: absolute URLs of links that point at PDFs. */
function pdfLinks(): string[] {
  return Array.from(document.querySelectorAll('a[href]'))
    .map((a) => (a as HTMLAnchorElement).href)
    .filter((href) => /^https?:/i.test(href) && /\.pdf(?:[?#]|$)/i.test(href));
}

export async function checkPdfs(page: Page, request: APIRequestContext, options: PdfOptions = {}): Promise<CheckResult<{ pdfs: PdfEvidence[] }>> {
  const max = options.max ?? 5;
  const maxBytes = options.maxBytes ?? 15 * 1024 * 1024;
  const urls: string[] = [];
  for (const frame of page.frames()) {
    for (const url of await frame.evaluate(pdfLinks).catch(() => [] as string[])) {
      const clean = url.split('#')[0]!;
      if (!urls.includes(clean)) urls.push(clean);
    }
  }

  const pdfs: PdfEvidence[] = [];
  const findings: Finding[] = [];
  for (const url of urls.slice(0, max)) {
    const evidence: PdfEvidence = { url, status: null, result: 'error' };
    pdfs.push(evidence);
    try {
      const head = await request.head(url, { timeout: 20_000, maxRedirects: 3, failOnStatusCode: false }).catch(() => undefined);
      const declared = Number(head?.headers()['content-length'] ?? 0);
      if (declared > maxBytes) {
        evidence.status = head?.status() ?? null;
        evidence.bytes = declared;
        evidence.result = 'too-large';
        continue;
      }
      await options.pace?.();
      const response = await request.get(url, { timeout: 30_000, maxRedirects: 3, failOnStatusCode: false });
      evidence.status = response.status();
      const body = await response.body();
      evidence.bytes = body.length;
      if (body.length > maxBytes) {
        evidence.result = 'too-large';
        continue;
      }
      if (body.subarray(0, 5).toString('latin1') !== '%PDF-') {
        evidence.result = 'not-pdf';
        continue;
      }
      const analysis = await analysePdf(new Uint8Array(body));
      Object.assign(evidence, analysis);
      evidence.result = analysis.textChars < SCANNED_CHARS_PER_PAGE * analysis.sampledPages ? 'scanned' : 'text';

      if (evidence.result === 'scanned') {
        findings.push(
          finding('pdf-scanned', `Scanned PDF: ${analysis.textChars} characters of text in the first ${analysis.sampledPages} page(s) of ${analysis.pages}.`, {
            target: url,
            details: { pages: analysis.pages, textChars: analysis.textChars },
          }),
        );
      } else if (!analysis.tagged) {
        findings.push(finding('pdf-untagged', 'The PDF has text but no tags.', { target: url, details: { pages: analysis.pages } }));
      }
    } catch (error) {
      evidence.error = String(error).split('\n')[0]?.slice(0, 200);
    }
  }
  return { findings, evidence: { pdfs } };
}
