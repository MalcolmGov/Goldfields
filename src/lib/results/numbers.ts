const YEAR = /^(19|20)\d{2}$/;
const FINANCIAL =
  /^\(?-?\d{1,3}(?:[, ]\d{3})*(?:\.\d+)?%?\)?$|^\(?-?\d+(?:\.\d+)?%?\)?$|^(?:—|–|-)$|^(?:n\/m|n\/a|nm)$/i;

export function isYearToken(token: string): boolean {
  return YEAR.test(token.trim());
}

export function isFinancialNumber(token: string): boolean {
  const value = token.trim().replace(/\s+/g, '');
  if (!value || isYearToken(value)) return false;
  return FINANCIAL.test(value);
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'results';
}
