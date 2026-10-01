import { isFinancialNumber, isYearToken } from './numbers';
import type { PdfGlyph } from './extractPdf';
import type { ResultsColumn, ResultsHighlight, ResultsRow, ResultsStatement, RowKind } from './types';

interface Phrase {
  text: string;
  x: number;
  right: number;
  height: number;
  fontName: string;
  financial: boolean;
}

interface Line {
  page: number;
  y: number;
  phrases: Phrase[];
  text: string;
  fontSize: number;
  bold: boolean;
  financials: Phrase[];
}

const COLUMN_TOLERANCE = 16;
const ZONE_GAP = 18;

function isBold(fontName: string): boolean {
  return /bold|black|semibold|demi/i.test(fontName);
}

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function clusterLines(glyphs: PdfGlyph[]): Line[] {
  const sorted = [...glyphs].sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
  const groups: PdfGlyph[][] = [];

  for (const glyph of sorted) {
    const current = groups[groups.length - 1];
    const anchor = current?.[0];
    const tolerance = Math.max(2.2, Math.min(glyph.height, anchor?.height || glyph.height) * 0.4);
    if (anchor && anchor.page === glyph.page && Math.abs(anchor.y - glyph.y) <= tolerance) {
      current.push(glyph);
    } else {
      groups.push([glyph]);
    }
  }

  return groups.map((group) => {
    const ordered = [...group].sort((a, b) => a.x - b.x);
    const phrases: Phrase[] = [];
    for (const glyph of ordered) {
      const financial = isFinancialNumber(glyph.text);
      const previous = phrases[phrases.length - 1];
      const gap = previous ? glyph.x - previous.right : Number.POSITIVE_INFINITY;
      if (previous && !previous.financial && !financial && gap >= 0 && gap < 8) {
        previous.text = clean(`${previous.text} ${glyph.text}`);
        previous.right = glyph.x + glyph.width;
        if (isBold(glyph.fontName)) previous.fontName = glyph.fontName;
      } else {
        phrases.push({
          text: glyph.text,
          x: glyph.x,
          right: glyph.x + glyph.width,
          height: glyph.height,
          fontName: glyph.fontName,
          financial,
        });
      }
    }

    return {
      page: ordered[0].page,
      y: ordered.reduce((sum, glyph) => sum + glyph.y, 0) / ordered.length,
      phrases,
      text: clean(phrases.map((phrase) => phrase.text).join(' ')),
      fontSize: Math.max(...ordered.map((glyph) => glyph.height)),
      bold: ordered.some((glyph) => isBold(glyph.fontName)),
      financials: phrases.filter((phrase) => phrase.financial),
    };
  }).filter((line) => line.text.length > 0 && line.y > 28);
}

function isFooter(line: Line): boolean {
  return /summarised consolidated financial statements for the year ended/i.test(line.text)
    || (/resources limited/i.test(line.text) && /20\d{2}/.test(line.text) && line.financials.length <= 1);
}

function isNote(line: Line): boolean {
  if (/r['’]?000|31 december/i.test(line.text) && line.text.length < 48) return false;
  if (/cents|million|\bkt\b|\boz\b/i.test(line.text)) return false;
  return /^(\*|notes?\b|\d+[\.)]\s+[A-Za-z]|\d+\s+[A-Za-z])/i.test(line.text)
    || /restated\. refer to note/i.test(line.text);
}

function isPeriodCaption(line: Line): boolean {
  return /^(for the|as at|year ended|six months ended|interim results)/i.test(line.text) && line.financials.length === 0;
}

function looksLikeHeader(line: Line): boolean {
  if (line.financials.length > 0) return false;
  if (isPeriodCaption(line)) return false;
  if (line.text.length > 110) return false;
  if (/^(notes?|restated|r['’]?000)$/i.test(line.text.replace(/\s+/g, ' '))) return true;
  if (/(?:^|\s)(H[12]|FY|Q[1-4]|Change|R['’]?000|Notes|Restated|31 December|US\$|\$m)(?:\s|$)/i.test(line.text)) return true;
  const years = line.text.match(/\b(19|20)\d{2}\b/g) || [];
  return years.length >= 1 && years.length === line.phrases.filter((phrase) => isYearToken(phrase.text) || /20\d{2}/.test(phrase.text)).length;
}

function clusterColumns(lines: Line[]): number[] {
  const edges = lines.flatMap((line) => line.financials.map((phrase) => phrase.right)).sort((a, b) => a - b);
  const groups: number[][] = [];
  for (const edge of edges) {
    const group = groups[groups.length - 1];
    if (!group || edge - group[group.length - 1] > COLUMN_TOLERANCE) groups.push([edge]);
    else group.push(edge);
  }
  return groups
    .filter((group) => group.length >= 2)
    .map((group) => group.reduce((sum, value) => sum + value, 0) / group.length);
}

function nearestColumn(right: number, columns: number[]): number {
  let best = 0;
  let distance = Number.POSITIVE_INFINITY;
  columns.forEach((center, index) => {
    const delta = Math.abs(right - center);
    if (delta < distance) {
      distance = delta;
      best = index;
    }
  });
  return distance <= 42 ? best : -1;
}

function lineLabel(line: Line, firstFigureX: number): string {
  return clean(line.phrases
    .filter((phrase) => !phrase.financial && phrase.right < firstFigureX - 8)
    .map((phrase) => phrase.text)
    .join(' '));
}

function lineCells(line: Line, columns: number[]): Array<string | null> {
  const cells: Array<string | null> = columns.map(() => null);
  for (const phrase of line.financials) {
    const index = nearestColumn(phrase.right, columns);
    if (index >= 0) cells[index] = phrase.text;
  }
  return cells;
}

function headerLabels(line: Line, columns: number[]): { stub: string; labels: string[] } {
  const labels = columns.map(() => '');
  const stub: string[] = [];
  const firstColumn = Math.min(...columns);
  for (const phrase of line.phrases) {
    const index = nearestColumn(phrase.right, columns);
    if (index < 0 || phrase.right < firstColumn - 28) {
      if (phrase.x < firstColumn - 28) stub.push(phrase.text);
      continue;
    }
    labels[index] = clean(labels[index] ? `${labels[index]} ${phrase.text}` : phrase.text);
  }
  return { stub: clean(stub.join(' ')), labels };
}

function rowKind(line: Line, label: string): RowKind {
  if (line.financials.length === 0) return 'section';
  if (!label || /^(total|gross profit|ebitda|profit before tax|profit for the period|total comprehensive|total equity|total assets|total liabilities)\b/i.test(label)) {
    return 'total';
  }
  if (line.bold && line.financials.length >= 2 && /total|profit|equity|assets|liabilities/i.test(label)) return 'total';
  return 'data';
}

function columnRole(label: string, rows: ResultsRow[], index: number): 'note' | 'figure' {
  if (/note/i.test(label)) return 'note';
  const values = rows
    .map((row) => row.cells[index])
    .filter((cell): cell is string => Boolean(cell && cell.trim()));
  if (values.length === 0) return 'figure';
  const noteLike = values.filter((value) => /^\d{1,2}$/.test(value.trim())).length;
  return noteLike / values.length > 0.6 ? 'note' : 'figure';
}

function confidenceFor(cells: Array<string | null>, roles: Array<'note' | 'figure'>): number {
  const required = cells.filter((_, index) => roles[index] !== 'note');
  if (required.length === 0) return 0.5;
  const filled = required.filter((cell) => cell && cell.trim()).length;
  return filled === required.length ? 1 : Math.max(0.45, filled / required.length);
}

export function reconstructStatements(glyphs: PdfGlyph[]): {
  statements: ResultsStatement[];
  narrative: string[];
  notes: string[];
  warnings: string[];
  highlights: ResultsHighlight[];
} {
  const lines = clusterLines(glyphs).filter((line) => !isFooter(line));
  const consumed = new Set<Line>();
  const notes: string[] = [];
  const warnings: string[] = [];
  const statements: ResultsStatement[] = [];

  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (isNote(line)) {
      if (keepNote(line.text)) notes.push(line.text);
      consumed.add(line);
      index += 1;
      continue;
    }

    if (line.financials.length < 2) {
      index += 1;
      continue;
    }

    const headerLines: Line[] = [];
    const titleLines: string[] = [];
    const leadingSections: Line[] = [];
    let period = '';
    let lookback = index - 1;
    while (lookback >= 0) {
      const previous = lines[lookback];
      if (previous.financials.length >= 2 || isFooter(previous)) break;
      if (isNote(previous) || previous.financials.length === 1) {
        lookback -= 1;
        continue;
      }
      const sectionLabel = previous.text.length > 0
        && previous.text.length < 42
        && !/[.!?]$/.test(previous.text)
        && !looksLikeHeader(previous)
        && !isPeriodCaption(previous);
      if (sectionLabel && headerLines.length === 0 && titleLines.length === 0) {
        leadingSections.unshift(previous);
        consumed.add(previous);
        lookback -= 1;
        continue;
      }
      if (looksLikeHeader(previous) || (/in relation to|% of revenue/i.test(previous.text) && previous.financials.length === 0)) {
        headerLines.unshift(previous);
        consumed.add(previous);
        lookback -= 1;
        continue;
      }
      if (isPeriodCaption(previous)) {
        period = previous.text;
        consumed.add(previous);
        lookback -= 1;
        continue;
      }
      if (previous.text.length > 90 || (/[.!?]$/.test(previous.text) && previous.text.length > 40 && !/statement/i.test(previous.text))) {
        lookback -= 1;
        continue;
      }
      titleLines.unshift(previous.text);
      consumed.add(previous);
      lookback -= 1;
      if (/statement of|cash flow|profit or loss|changes in equity|income statement/i.test(titleLines.join(' '))) break;
      if (titleLines.length >= 3) break;
    }

    const body: Line[] = [...leadingSections];
    let cursor = index;
    while (cursor < lines.length) {
      const candidate = lines[cursor];
      if (candidate.page !== line.page || isFooter(candidate)) break;
      if (candidate.financials.length >= 2) {
        body.push(candidate);
        consumed.add(candidate);
        cursor += 1;
        continue;
      }
      const section = candidate.financials.length === 0
        && candidate.text.length > 0
        && candidate.text.length < 70
        && !looksLikeHeader(candidate)
        && !isNote(candidate)
        && !isPeriodCaption(candidate)
        && !/[.!?]$/.test(candidate.text);
      const nextData = lines.slice(cursor + 1, cursor + 4).some((upcoming) => upcoming.financials.length >= 2);
      if (section && nextData) {
        body.push(candidate);
        consumed.add(candidate);
        cursor += 1;
        continue;
      }
      break;
    }

    const figureLines = body.filter((row) => row.financials.length >= 2);
    const columns = clusterColumns(figureLines);
    if (columns.length < 2 || figureLines.length < 2) {
      index = Math.max(cursor, index + 1);
      continue;
    }

    const columnLabels = columns.map(() => '');
    let stubLabel = '';
    for (const header of headerLines) {
      const parsed = headerLabels(header, columns);
      if (parsed.stub) stubLabel = parsed.stub;
      parsed.labels.forEach((label, labelIndex) => {
        if (label) columnLabels[labelIndex] = clean(columnLabels[labelIndex] ? `${columnLabels[labelIndex]} ${label}` : label);
      });
    }

    const firstFigureX = Math.min(...figureLines.flatMap((row) => row.financials.map((phrase) => phrase.x)));
    const draftRows = body.map((row) => {
      const label = row.financials.length === 0 ? row.text : lineLabel(row, firstFigureX);
      return { row, label, kind: rowKind(row, label) };
    });

    const rows: ResultsRow[] = draftRows.map((draft, rowIndex) => {
      let label = draft.label;
      let kind = draft.kind;
      if (!label && kind === 'total') {
        const previousSection = [...draftRows].slice(0, rowIndex).reverse().find((item) => item.kind === 'section');
        label = previousSection ? `Total ${previousSection.label.charAt(0).toLowerCase()}${previousSection.label.slice(1)}` : 'Total';
      }
      const cells = kind === 'section' ? columns.map(() => null) : lineCells(draft.row, columns);
      return {
        id: `row_${statements.length}_${rowIndex}`,
        label,
        kind,
        cells,
        confidence: 1,
      };
    });

    const roles = columns.map((_, columnIndex) => columnRole(columnLabels[columnIndex] || '', rows, columnIndex));
    const dropColumn = columns.map((_, columnIndex) => {
      const label = columnLabels[columnIndex] || '';
      const values = rows.map((row) => row.cells[columnIndex]).filter((cell) => cell && cell.trim());
      const dataRows = rows.filter((row) => row.kind !== 'section').length || 1;
      const proseLabel = label.length > 40 && !/R['’]?000|\bnotes?\b/i.test(label);
      const sparse = values.length / dataRows < 0.3 && !/note|20\d{2}|R['’]?000/i.test(label);
      return proseLabel || sparse;
    });
    const kept = dropColumn.some(Boolean) && dropColumn.some((flag) => !flag)
      ? columns.map((_, columnIndex) => columnIndex).filter((columnIndex) => !dropColumn[columnIndex])
      : columns.map((_, columnIndex) => columnIndex);
    const keptRoles = kept.map((columnIndex) => roles[columnIndex]);
    rows.forEach((row) => {
      row.cells = kept.map((columnIndex) => row.cells[columnIndex] ?? null);
      if (row.kind === 'section') return;
      row.confidence = confidenceFor(row.cells, keptRoles);
      if (row.confidence < 1) warnings.push(`“${row.label || 'A total row'}” is missing a figure.`);
    });

    const title = polishTitle(clean(titleLines.join(' ')) || 'Financial table', rows);
    const confidence = rows.length ? rows.reduce((sum, row) => sum + row.confidence, 0) / rows.length : 0;
    statements.push({
      id: `stmt_${statements.length}`,
      title,
      period,
      stubLabel,
      columns: kept.map((columnIndex, position) => ({
        id: `col_${statements.length}_${position}`,
        label: tidyLabel(columnLabels[columnIndex] || `Column ${position + 1}`),
        role: keptRoles[position],
      })),
      rows,
      confidence,
    });
    index = cursor;
  }

  borrowYearLabels(statements);

  return {
    statements,
    narrative: commentary(lines, consumed),
    notes: [...new Set(notes)],
    warnings,
    highlights: reviewHighlights(lines, consumed),
  };
}

function borrowYearLabels(statements: ResultsStatement[]): void {
  const donor = statements.find((statement) => statement.columns.filter((column) => /20\d{2}/.test(column.label)).length >= 2);
  const years = donor?.columns.map((column) => column.label.match(/20\d{2}/)?.[0]).filter((year): year is string => Boolean(year));
  if (!years || years.length < 2) return;
  for (const statement of statements) {
    if (statement.columns.length !== years.length) continue;
    if (!statement.columns.every((column) => /^Column \d+$/.test(column.label))) continue;
    statement.columns.forEach((column, index) => {
      column.label = years[index];
    });
  }
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function tidyLabel(label: string): string {
  return clean(label.replace(/\b([A-Za-z]{3,})(?:\s+\1\b)+/gi, '$1'));
}

function isBoilerplate(text: string): boolean {
  return /company secretary|transfer secretar|share code|registration number|incorporated in the republic|investor relations|proprietary limited|\bemail:|\btel:/i.test(text);
}

function keepNote(text: string): boolean {
  if (isBoilerplate(text)) return false;
  if (/restated\. refer to note/i.test(text)) return true;
  if (text.length < 40 || wordCount(text) < 8 || !/[.!?]$/.test(text)) return false;
  return /^(\*|\d+[\.)]?)\s+[A-Z]/.test(text);
}

function polishTitle(title: string, rows: ResultsRow[]): string {
  const joined = rows.map((row) => row.label).join(' ');
  const weak = title.length > 90
    || /financial table/i.test(title)
    || /in relation/i.test(title)
    || /previously|currently/i.test(title)
    || /(\b[A-Za-z]{3,}\b)(?:\s+\1\b)/i.test(title);
  if (/previously|currently/i.test(title) && /financial position/i.test(title)) return 'Prior period restatement of financial position';
  if (/previously|currently/i.test(title) && /profit or loss/i.test(title)) return 'Prior period restatement of profit or loss';
  if (/previously|currently/i.test(title) && /cash flow/i.test(title)) return 'Prior period restatement of cash flows';
  if (!weak && /statement of|cash flow|profit or loss|changes in equity|income statement|operational review/i.test(title)) {
    return title;
  }
  if (/headline earnings/i.test(title)) return 'Headline earnings reconciliation';
  if (/level 3 fair value/i.test(title)) return 'Reconciliation of Level 3 fair value measurements';
  if (/ferrochrome sales/i.test(joined) && /chrome ore sales/i.test(joined)) return 'Revenue';
  if (/contracted but not provided/i.test(joined)) return 'Capital commitments';
  if (/profit before taxation/i.test(joined) && /depreciation and amortisation/i.test(joined)) return 'Cash generated from operations';
  const section = rows.find((row) => row.kind === 'section' && /revenue destination|key customers/i.test(row.label));
  if (section) {
    if (/ferrochrome/i.test(title)) return `${section.label} — ferrochrome`;
    if (/chrome ore/i.test(title)) return `${section.label} — chrome ore`;
    return section.label;
  }
  if (!weak) return title;
  return title.length > 90 ? 'Supporting analysis' : title;
}

function mergeProse(chunks: string[]): string[] {
  const paragraphs: string[] = [];
  let buffer = '';
  const flush = () => {
    const text = clean(buffer);
    buffer = '';
    const words = wordCount(text);
    if (words < 12 || !/[.!?]$/.test(text) || isBoilerplate(text)) return;
    const digits = (text.match(/\d/g) || []).length;
    if (digits / text.length > 0.22) return;
    paragraphs.push(text);
  };
  for (const chunk of chunks) {
    if (isBoilerplate(chunk) || (wordCount(chunk) <= 6 && !/[.!?]$/.test(chunk))) {
      flush();
      continue;
    }
    if (!buffer) buffer = chunk;
    else if (/[A-Za-z]-$/.test(buffer)) buffer = `${buffer.slice(0, -1)}${chunk}`;
    else buffer = `${buffer} ${chunk}`;
    if (/[.!?]["')\]]*$/.test(chunk) && wordCount(buffer) >= 12) flush();
  }
  flush();
  return paragraphs;
}

function commentary(lines: Line[], consumed: Set<Line>): string[] {
  const pages = [...new Set(lines.map((line) => line.page))];
  const paragraphs: string[] = [];
  for (const page of pages) {
    const pageLines = lines.filter((line) => line.page === page && !consumed.has(line) && !isNote(line) && !isFooter(line));
    if (pageLines.some((line) => line.financials.length >= 2)) continue;
    const columns = new Map<number, string[]>();
    for (const line of pageLines) {
      let zoneX = line.phrases[0]?.x ?? 0;
      let buffer: string[] = [];
      const flush = () => {
        const text = clean(buffer.join(' '));
        if (text.length > 1) {
          const key = [...columns.keys()].find((start) => Math.abs(start - zoneX) < 40) ?? zoneX;
          columns.set(key, [...(columns.get(key) || []), text]);
        }
        buffer = [];
      };
      line.phrases.forEach((phrase, phraseIndex) => {
        const previous = line.phrases[phraseIndex - 1];
        if (previous && phrase.x - previous.right > ZONE_GAP) {
          flush();
          zoneX = phrase.x;
        }
        buffer.push(phrase.text);
      });
      flush();
    }
    for (const key of [...columns.keys()].sort((a, b) => a - b)) {
      paragraphs.push(...mergeProse(columns.get(key) || []));
      if (paragraphs.length >= 12) return paragraphs.slice(0, 12);
    }
  }
  return paragraphs.slice(0, 12);
}

function reviewHighlights(lines: Line[], consumed: Set<Line>): ResultsHighlight[] {
  const valuePattern = /^(?:R[\d\s]+ million|[\d.]+\s*cents|None|\d+\.\d+|\d[\d\s]*kt|\d[\d\s,]*oz)$/i;
  const cards: Array<ResultsHighlight & { y: number; x: number }> = [];
  const pages = new Set(lines.map((line) => line.page));

  for (const page of pages) {
    const pageLines = lines.filter((line) => line.page === page && !consumed.has(line));
    if (pageLines.filter((line) => line.financials.length >= 2).length >= 3) continue;
    const bands: Array<{ x: number; lines: Line[] }> = [];
    for (const line of pageLines) {
      const zones: Phrase[][] = [];
      line.phrases.forEach((phrase) => {
        const zone = zones[zones.length - 1];
        const previous = zone?.[zone.length - 1];
        if (previous && phrase.x - previous.right > ZONE_GAP) zones.push([phrase]);
        else if (zone) zone.push(phrase);
        else zones.push([phrase]);
      });
      for (const zone of zones) {
        const x = zone[0].x;
        const band = bands.find((item) => Math.abs(item.x - x) < 46);
        const text = clean(zone.map((phrase) => phrase.text).join(' '));
        const zoned: Line = { ...line, phrases: zone, text, financials: zone.filter((phrase) => phrase.financial) };
        if (band) band.lines.push(zoned);
        else bands.push({ x, lines: [zoned] });
      }
    }

    for (const band of bands) {
      band.lines.forEach((line, lineIndex) => {
        if (!valuePattern.test(line.text)) return;
        const captionParts: string[] = [];
        for (let cursor = lineIndex - 1; cursor >= 0 && captionParts.length < 4; cursor -= 1) {
          const text = band.lines[cursor].text;
          if (valuePattern.test(text) || /^\(/.test(text)) break;
          if (/^(financial|safety|operational)$/i.test(text)) break;
          if (text.length < 3 || text.length > 72) continue;
          captionParts.unshift(text);
        }
        const caption = clean(captionParts.join(' '));
        const comparison = band.lines[lineIndex + 1]?.text.startsWith('(') ? band.lines[lineIndex + 1].text : '';
        if (wordCount(caption) < 3) return;
        cards.push({ label: caption, value: line.text, comparison, y: line.y, x: band.x });
      });
    }
  }

  return cards
    .sort((a, b) => b.y - a.y || a.x - b.x)
    .slice(0, 8)
    .map(({ label, value, comparison }) => ({ label, value, comparison }));
}
