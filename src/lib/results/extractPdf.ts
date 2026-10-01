import path from 'path';
import { pathToFileURL } from 'url';

export interface PdfGlyph {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  fontName: string;
}

interface PdfTextItem {
  str?: string;
  width?: number;
  height?: number;
  transform?: number[];
  fontName?: string;
}

export async function extractPdfGlyphs(data: Uint8Array): Promise<{ glyphs: PdfGlyph[]; pageCount: number }> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerPath = path.join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

  const task = pdfjs.getDocument({
    data,
    useSystemFonts: true,
    isEvalSupported: false,
  });
  const pdf = await task.promise;
  const glyphs: PdfGlyph[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    for (const item of content.items as PdfTextItem[]) {
      const text = item.str?.replace(/\s+/g, ' ').trim();
      if (!text || !item.transform) continue;
      glyphs.push({
        text,
        x: item.transform[4] ?? 0,
        y: item.transform[5] ?? 0,
        width: item.width ?? 0,
        height: item.height || Math.hypot(item.transform[2] ?? 0, item.transform[3] ?? 0) || 10,
        page: pageNumber,
        fontName: item.fontName || '',
      });
    }
  }

  await pdf.destroy();
  return { glyphs, pageCount: pdf.numPages };
}
