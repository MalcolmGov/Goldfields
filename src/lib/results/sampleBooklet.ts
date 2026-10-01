import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

const NAVY = rgb(0.05, 0.12, 0.2);
const INK = rgb(0.09, 0.16, 0.22);

function draw(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  font: PDFFont
) {
  page.drawText(text, { x, y, size, font, color: INK });
}

function drawRight(
  page: PDFPage,
  text: string,
  right: number,
  y: number,
  size: number,
  font: PDFFont
) {
  const width = font.widthOfTextAtSize(text, size);
  draw(page, text, right - width, y, size, font);
}

function drawRow(
  page: PDFPage,
  y: number,
  label: string,
  values: string[],
  labelFont: PDFFont,
  valueFont: PDFFont,
  size: number,
  rights: number[]
) {
  draw(page, label, 48, y, size, labelFont);
  values.forEach((value, index) => {
    drawRight(page, value, rights[index], y, size, valueFont);
  });
}

/**
 * A synthetic interim-results booklet used to prove table reconstruction.
 * The figures are demonstration data, not a client's published results.
 */
export async function buildSampleResultsPdf(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const rights = [390, 470, 545];

  const cover = pdf.addPage([595.28, 841.89]);
  cover.drawRectangle({ x: 0, y: 760, width: 595.28, height: 82, color: NAVY });
  cover.drawText('HELIOS GOLD LIMITED', {
    x: 48,
    y: 798,
    size: 18,
    font: bold,
    color: rgb(1, 1, 1),
  });
  cover.drawText('Interim results for the six months ended 30 June 2026', {
    x: 48,
    y: 776,
    size: 11,
    font: regular,
    color: rgb(0.93, 0.89, 0.78),
  });

  draw(cover, 'Unaudited condensed financial statements', 48, 730, 12, bold);
  draw(cover, 'Figures in US$ million except per share data, production and unit costs.', 48, 712, 9, regular);

  const narrative = [
    'Helios Gold delivered a stronger first half, with higher realised gold prices and steady',
    'production across the portfolio. Cost discipline held all-in sustaining costs below the',
    'comparative period. These demonstration statements exercise the Bastion table converter.',
  ];
  narrative.forEach((line, index) => {
    draw(cover, line, 48, 680 - index * 14, 10, regular);
  });

  draw(cover, 'Condensed income statement', 48, 620, 13, bold);
  drawRow(cover, 598, '', ['H1 2026', 'H1 2025', 'Change'], bold, bold, 9, rights);
  const income: Array<[string, string[]]> = [
    ['Revenue', ['1,842', '1,615', '14%']],
    ['Cost of sales', ['(1,104)', '(1,021)', '8%']],
    ['Gross profit', ['738', '594', '24%']],
    ['Operating costs', ['(186)', '(171)', '9%']],
    ['EBITDA', ['552', '423', '30%']],
    ['Depreciation and amortisation', ['(214)', '(198)', '8%']],
    ['Profit before tax', ['338', '225', '50%']],
    ['Taxation', ['(91)', '(62)', '47%']],
    ['Profit for the period', ['247', '163', '52%']],
  ];
  income.forEach((row, index) => {
    const isTotal = row[0] === 'Gross profit' || row[0] === 'EBITDA' || row[0] === 'Profit before tax' || row[0] === 'Profit for the period';
    drawRow(cover, 576 - index * 18, row[0], row[1], isTotal ? bold : regular, isTotal ? bold : regular, 10, rights);
  });

  const operations = pdf.addPage([595.28, 841.89]);
  draw(operations, 'Operational review', 48, 780, 13, bold);
  draw(operations, 'Production and unit costs for the half year.', 48, 762, 10, regular);
  drawRow(operations, 732, '', ['H1 2026', 'H1 2025', 'Change'], bold, bold, 9, rights);
  const production: Array<[string, string[]]> = [
    ['Attributable gold production (koz)', ['612', '574', '7%']],
    ['All-in sustaining cost (US$/oz)', ['1,486', '1,542', '(4%)']],
    ['All-in cost (US$/oz)', ['1,721', '1,804', '(5%)']],
  ];
  production.forEach((row, index) => {
    drawRow(operations, 708 - index * 18, row[0], row[1], regular, regular, 10, rights);
  });

  draw(operations, 'Notes', 48, 620, 13, bold);
  draw(operations, '1 Figures are unaudited demonstration amounts for the Bastion results converter.', 48, 598, 9, regular);
  draw(operations, '2 Change compares the current half year with the comparative half year.', 48, 584, 9, regular);

  return pdf.save();
}
