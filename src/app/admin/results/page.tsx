'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ResultsPublication } from '@/components/results/ResultsPublication';
import type { ResultsDocument, StoredResultsDocument } from '@/lib/results/types';

export default function ResultsStudioPage() {
  const [documents, setDocuments] = useState<StoredResultsDocument[]>([]);
  const [current, setCurrent] = useState<StoredResultsDocument | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch('/api/admin/results');
    if (!response.ok) return;
    const body = await response.json();
    setDocuments(body.documents || []);
  }

  useEffect(() => {
    refresh().catch(() => setError('Could not load saved results.'));
  }, []);

  async function convertExample(example: 'sample' | 'merafe') {
    setBusy(example);
    setError(null);
    try {
      const response = await fetch('/api/admin/results/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(example === 'merafe' ? { example: 'merafe' } : { sample: true }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Sample conversion failed');
      setCurrent(body);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Example conversion failed');
    } finally {
      setBusy(null);
    }
  }

  async function convertFile(file: File) {
    setBusy('upload');
    setError(null);
    try {
      const form = new FormData();
      form.set('file', file);
      const response = await fetch('/api/admin/results/convert', { method: 'POST', body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'PDF conversion failed');
      setCurrent(body);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF conversion failed');
    } finally {
      setBusy(null);
    }
  }

  function updateDocument(next: ResultsDocument) {
    setCurrent((existing) => existing ? { ...existing, document: next } : existing);
  }

  function updateCell(statementId: string, rowId: string, cellIndex: number, value: string) {
    if (!current) return;
    const document = structuredClone(current.document);
    const statement = document.statements.find((item) => item.id === statementId);
    const row = statement?.rows.find((item) => item.id === rowId);
    if (!row) return;
    row.cells[cellIndex] = value;
    row.confidence = row.cells.every((cell) => cell && cell.trim()) ? 1 : 0.6;
    updateDocument(document);
  }

  async function save(status: 'draft' | 'published') {
    if (!current) return;
    setBusy(status);
    setError(null);
    try {
      const response = await fetch(`/api/admin/results/${current.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: current.document, status }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Save failed');
      setCurrent(body);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(null);
    }
  }

  const document = current?.document;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-700">Bastion results centre</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">PDF results to HTML</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            Booklets are read as positioned text, rebuilt into statement tables, and published as an HTML results page. Review every figure before a client sees it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => convertExample('merafe')}
            disabled={busy !== null}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy === 'merafe' ? 'Converting Merafe…' : 'Convert Merafe 2025 results'}
          </button>
          <button
            type="button"
            onClick={() => convertExample('sample')}
            disabled={busy !== null}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60 dark:border-slate-700 dark:text-slate-100"
          >
            {busy === 'sample' ? 'Converting…' : 'Convert sample booklet'}
          </button>
          <label className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-100">
            {busy === 'upload' ? 'Reading PDF…' : 'Upload PDF'}
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              disabled={busy !== null}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) convertFile(file);
                event.target.value = '';
              }}
            />
          </label>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>
      )}

      {document && current && (
        <div className="grid items-start gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{document.issuer}</p>
                <p className="text-xs text-slate-500">{current.status === 'published' ? 'Published' : 'Draft review'}</p>
              </div>
              {current.status === 'published' && (
                <Link href={`/results/${current.slug}`} target="_blank" className="text-xs font-semibold text-violet-700">
                  Open HTML
                </Link>
              )}
            </div>
            {document.warnings.length > 0 && (
              <ul className="space-y-1 text-xs text-amber-800">
                {document.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            )}
            {document.statements.map((statement) => (
              <div key={statement.id} className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{statement.title}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="py-1 text-left font-medium text-slate-400">Line</th>
                        {statement.columns.map((column) => (
                          <th key={column.id} className="py-1 text-right font-medium text-slate-400">{column.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {statement.rows.filter((row) => row.kind !== 'section').map((row) => (
                        <tr key={row.id}>
                          <td className="max-w-[140px] truncate py-1 pr-2">{row.label}</td>
                          {row.cells.map((cell, cellIndex) => (
                            <td key={`${row.id}-${cellIndex}`} className="py-1 pl-1">
                              <input
                                value={cell || ''}
                                onChange={(event) => updateCell(statement.id, row.id, cellIndex, event.target.value)}
                                className="w-full rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-right font-mono text-[11px] dark:border-slate-700 dark:bg-slate-900"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => save('draft')} disabled={busy !== null} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">
                Save draft
              </button>
              <button type="button" onClick={() => save('published')} disabled={busy !== null} className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white">
                {busy === 'published' ? 'Publishing…' : 'Publish HTML'}
              </button>
            </div>
          </section>
          <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
            <ResultsPublication document={document} published={current.status === 'published'} />
          </div>
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent conversions</h2>
        <ul className="mt-3 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950">
          {documents.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">No booklets converted yet.</li>}
          {documents.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <button type="button" onClick={() => setCurrent(item)} className="truncate text-left font-medium">
                {item.title}
              </button>
              <span className="shrink-0 text-xs uppercase tracking-wide text-slate-500">{item.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
