import type { PdfGlyph } from './extractPdf';
import { reconstructStatements } from './reconstruct';
import type { ResultsDocument, ResultsHighlight, ResultsStatement } from './types';

function linesOf(glyphs: PdfGlyph[]): string[] {
  const groups = new Map<string, PdfGlyph[]>();
  for (const glyph of glyphs) {
    const key = `${glyph.page}:${Math.round(glyph.y)}`;
    groups.set(key, [...(groups.get(key) || []), glyph]);
  }
  return [...groups.values()].map((items) => items
    .sort((a, b) => a.x - b.x)
    .map((item) => item.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim());
}

function issuerFrom(glyphs: PdfGlyph[]): string {
  const names = glyphs.filter((glyph) => glyph.page === 1
    && /limited|plc|ltd/i.test(glyph.text)
    && glyph.text.length < 48
    && !/statement|secretary|incorporated|financial/i.test(glyph.text));
  const caps = names.find((glyph) => glyph.text === glyph.text.toUpperCase());
  if (caps) return caps.text.trim();
  if (names[0]) return names[0].text.trim();
  const lines = linesOf(glyphs.filter((glyph) => glyph.page === 1));
  return lines.find((line) => line.length > 3 && !/^(19|20)\d{2}$/.test(line)) || 'Corporate results';
}

const MONTHS = new Set(['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']);

function tidyPeriod(raw: string): string {
  const ended = raw.match(/((?:financial year|six months|half-year|year|period) ended \d{1,2} [A-Za-z]+ 20\d{2})/i);
  if (!ended) return raw;
  const noisy = raw === raw.toUpperCase() || raw.length > 78;
  if (!noisy) return raw;
  return ended[1].toLowerCase().split(' ').map((word, index) => (
    index === 0 || MONTHS.has(word) ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word
  )).join(' ');
}

function periodFrom(glyphs: PdfGlyph[], fallback: string): string {
  const lines = linesOf(glyphs.filter((glyph) => glyph.page <= 2));
  const raw = lines.find((line) => /ended \d{1,2} \w+ 20\d{2}/i.test(line))
    || lines.find((line) => /interim results|financial year/i.test(line))
    || fallback;
  return tidyPeriod(raw);
}

function unitFrom(statements: ResultsStatement[]): string {
  const labels = statements.flatMap((statement) => statement.columns.map((column) => column.label)).join(' ');
  if (/R['’]?000/i.test(labels)) return 'R’000';
  if (/US\$ million/i.test(labels)) return 'US$ million';
  return 'As stated in the source PDF';
}

function fallbackHighlights(statements: ResultsStatement[]): ResultsHighlight[] {
  const patterns = [/revenue\b/i, /profit for the period|total comprehensive income/i, /all-in sustaining cost/i, /attributable gold production/i];
  const highlights: ResultsHighlight[] = [];
  for (const pattern of patterns) {
    for (const statement of statements) {
      const row = statement.rows.find((item) => pattern.test(item.label) && item.kind !== 'section');
      if (!row) continue;
      const figureIndex = statement.columns.findIndex((column) => column.role === 'figure');
      const value = (figureIndex >= 0 ? row.cells[figureIndex] : row.cells.find(Boolean)) || '';
      if (!value) continue;
      const prior = statement.columns.map((column, index) => ({ column, index })).filter((item) => item.column.role === 'figure')[1];
      highlights.push({
        label: row.label,
        value,
        comparison: prior?.column ? `versus ${prior.column.label} (${row.cells[prior.index] || '—'})` : '',
      });
      break;
    }
  }
  return highlights.slice(0, 4);
}

export function composeResultsDocument(
  glyphs: PdfGlyph[],
  pageCount: number,
  sourceFilename: string
): ResultsDocument {
  const reconstructed = reconstructStatements(glyphs);
  const issuer = issuerFrom(glyphs);
  const periodLabel = periodFrom(glyphs, reconstructed.statements.find((statement) => statement.period)?.period || 'Financial results');
  const warnings = [...reconstructed.warnings];
  if (reconstructed.statements.length === 0) {
    warnings.push('No financial table with aligned figure columns was found.');
  }

  return {
    issuer,
    title: periodLabel,
    periodLabel,
    unit: unitFrom(reconstructed.statements),
    narrative: reconstructed.narrative,
    highlights: reconstructed.highlights.length > 0 ? reconstructed.highlights : fallbackHighlights(reconstructed.statements),
    statements: reconstructed.statements,
    notes: reconstructed.notes,
    warnings,
    sourceFilename,
    pageCount,
  };
}
