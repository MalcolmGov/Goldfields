export type RowKind = 'data' | 'section' | 'total';

export interface ResultsColumn {
  id: string;
  label: string;
  role: 'note' | 'figure';
}

export interface ResultsRow {
  id: string;
  label: string;
  kind: RowKind;
  cells: Array<string | null>;
  confidence: number;
}

export interface ResultsStatement {
  id: string;
  title: string;
  period: string;
  stubLabel: string;
  columns: ResultsColumn[];
  rows: ResultsRow[];
  confidence: number;
}

export interface ResultsHighlight {
  label: string;
  value: string;
  comparison: string;
}

export interface ResultsDocument {
  issuer: string;
  title: string;
  periodLabel: string;
  unit: string;
  narrative: string[];
  highlights: ResultsHighlight[];
  statements: ResultsStatement[];
  notes: string[];
  warnings: string[];
  sourceFilename: string;
  pageCount: number;
}

export interface StoredResultsDocument {
  id: string;
  clientId: string | null;
  slug: string;
  title: string;
  status: 'draft' | 'published';
  sourceFilename: string;
  document: ResultsDocument;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}
