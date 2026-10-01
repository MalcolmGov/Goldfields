import crypto from 'crypto';
import { getDb } from '@/lib/db/client';
import { slugify } from './numbers';
import type { ResultsDocument, StoredResultsDocument } from './types';

let schemaReady: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getDb();
      await db.execute(`
        CREATE TABLE IF NOT EXISTS results_documents (
          id TEXT PRIMARY KEY,
          client_id TEXT,
          slug TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          status TEXT NOT NULL,
          source_filename TEXT,
          document_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          published_at TEXT
        );
      `);
    })();
  }
  await schemaReady;
}

function mapRow(row: Record<string, unknown>): StoredResultsDocument {
  return {
    id: String(row.id),
    clientId: row.client_id ? String(row.client_id) : null,
    slug: String(row.slug),
    title: String(row.title),
    status: row.status === 'published' ? 'published' : 'draft',
    sourceFilename: String(row.source_filename || ''),
    document: JSON.parse(String(row.document_json)) as ResultsDocument,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    publishedAt: row.published_at ? String(row.published_at) : null,
  };
}

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const db = getDb();
  let slug = slugify(base);
  let suffix = 2;
  while (true) {
    const existing = await db.execute({
      sql: `SELECT id FROM results_documents WHERE slug = ? LIMIT 1`,
      args: [slug],
    });
    const row = existing.rows[0] as { id?: string } | undefined;
    if (!row || row.id === ignoreId) return slug;
    slug = `${slugify(base)}-${suffix}`;
    suffix += 1;
  }
}

export async function saveResultsDocument(input: {
  id?: string;
  clientId?: string | null;
  document: ResultsDocument;
  status: 'draft' | 'published';
}): Promise<StoredResultsDocument> {
  await ensureSchema();
  const db = getDb();
  const now = new Date().toISOString();
  const title = `${input.document.issuer} — ${input.document.periodLabel}`;

  if (input.id) {
    const current = await getResultsDocument(input.id);
    if (!current) throw new Error('Results document not found');
    const publishedAt = input.status === 'published' ? current.publishedAt || now : null;
    await db.execute({
      sql: `UPDATE results_documents
            SET title = ?, status = ?, source_filename = ?, document_json = ?, updated_at = ?, published_at = ?
            WHERE id = ?`,
      args: [
        title,
        input.status,
        input.document.sourceFilename,
        JSON.stringify(input.document),
        now,
        publishedAt,
        input.id,
      ],
    });
    const saved = await getResultsDocument(input.id);
    if (!saved) throw new Error('Results document not found after save');
    return saved;
  }

  const id = `res_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const slug = await uniqueSlug(`${input.document.issuer} ${input.document.periodLabel}`);
  await db.execute({
    sql: `INSERT INTO results_documents
          (id, client_id, slug, title, status, source_filename, document_json, created_at, updated_at, published_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.clientId || null,
      slug,
      title,
      input.status,
      input.document.sourceFilename,
      JSON.stringify(input.document),
      now,
      now,
      input.status === 'published' ? now : null,
    ],
  });
  const saved = await getResultsDocument(id);
  if (!saved) throw new Error('Results document not found after insert');
  return saved;
}

export async function listResultsDocuments(): Promise<StoredResultsDocument[]> {
  await ensureSchema();
  const db = getDb();
  const result = await db.execute(
    `SELECT * FROM results_documents ORDER BY updated_at DESC`
  );
  return result.rows.map((row) => mapRow(row as Record<string, unknown>));
}

export async function getResultsDocument(id: string): Promise<StoredResultsDocument | null> {
  await ensureSchema();
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM results_documents WHERE id = ? LIMIT 1`,
    args: [id],
  });
  const row = result.rows[0];
  return row ? mapRow(row as Record<string, unknown>) : null;
}

export async function getPublishedResultsBySlug(slug: string): Promise<StoredResultsDocument | null> {
  await ensureSchema();
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM results_documents WHERE slug = ? AND status = 'published' LIMIT 1`,
    args: [slug],
  });
  const row = result.rows[0];
  return row ? mapRow(row as Record<string, unknown>) : null;
}
