import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { analysePdf, checkPdfs } from '../../src/checks/pdf.ts';
import { useHarness } from '../helpers/harness.ts';

// A valid 1×1 PNG; stretched over the page it stands in for a scanned image.
const PNG_1X1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function textPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  const lines = [
    'Passport camp notice',
    'Applicants with appointments on Saturday must carry their original documents.',
    'Bring the printed application receipt and two recent photographs.',
  ];
  lines.forEach((line, i) => page.drawText(line, { x: 50, y: 780 - i * 20, size: 12, font }));
  return doc.save();
}

async function scannedPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const image = await doc.embedPng(Buffer.from(PNG_1X1, 'base64'));
  doc.addPage([595, 842]).drawImage(image, { x: 0, y: 0, width: 595, height: 842 });
  return doc.save();
}

const h = useHarness();

// Top-level before() hooks don't wait for the harness's own, so register files inside each test.
async function serveGeneratedPdfs(): Promise<void> {
  h.server.add('/generated/text.pdf', await textPdf(), 'application/pdf');
  h.server.add('/generated/scan.pdf', await scannedPdf(), 'application/pdf');
}

test('analysePdf reads text from a text PDF and finds none in a scanned one', async () => {
  const text = await analysePdf(await textPdf());
  assert.equal(text.pages, 1);
  assert.ok(text.textChars > 100);
  assert.equal(text.tagged, false);
  const scan = await analysePdf(await scannedPdf());
  assert.equal(scan.textChars, 0);
});

test('linked PDFs are fetched once each and classified', async () => {
  await serveGeneratedPdfs();
  await h.load('pdf-links.html');
  const { findings, evidence } = await checkPdfs(h.session.page, h.session.context.request);
  assert.deepEqual(findings.map((f) => [f.rule, f.severity]).sort(), [
    ['pdf-scanned', 'barrier'],
    ['pdf-untagged', 'info'],
  ]);
  assert.equal(evidence.pdfs.length, 3, 'the duplicate link is fetched once');
  const missing = evidence.pdfs.find((p) => p.url.endsWith('missing.pdf'));
  assert.equal(missing?.result, 'not-pdf');
  assert.equal(missing?.status, 404);
});

test('at most `max` PDFs are fetched', async () => {
  await serveGeneratedPdfs();
  await h.load('pdf-links.html');
  const { evidence } = await checkPdfs(h.session.page, h.session.context.request, { max: 1 });
  assert.equal(evidence.pdfs.length, 1);
});
