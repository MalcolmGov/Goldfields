import fs from 'fs';
import path from 'path';
import { composeResultsDocument } from './compose';
import { extractPdfGlyphs } from './extractPdf';
import { buildSampleResultsPdf } from './sampleBooklet';
import type { ResultsDocument } from './types';

export async function convertPdfBytes(data: Uint8Array, sourceFilename: string): Promise<ResultsDocument> {
  const extracted = await extractPdfGlyphs(data);
  return composeResultsDocument(extracted.glyphs, extracted.pageCount, sourceFilename);
}

export async function convertSampleBooklet(): Promise<ResultsDocument> {
  const bytes = await buildSampleResultsPdf();
  return convertPdfBytes(bytes, 'helios-gold-interim-results-h1-2026.pdf');
}

export async function convertMerafeExample(): Promise<ResultsDocument> {
  const file = path.join(process.cwd(), 'fixtures/merafe-summarised-results-2025.pdf');
  const bytes = new Uint8Array(fs.readFileSync(file));
  return convertPdfBytes(bytes, 'merafe-summarised-results-2025.pdf');
}
