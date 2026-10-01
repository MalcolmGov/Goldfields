import type { ResultsDocument, ResultsRow } from '@/lib/results/types';

function rowClass(row: ResultsRow): string {
  if (row.kind === 'section') {
    return 'bg-[#f3efe6] text-[#5c4b2a]';
  }
  if (row.kind === 'total') {
    return 'font-semibold text-[#102033] border-t border-[#102033]';
  }
  if (row.confidence < 1) {
    return 'bg-[#fff6e8]';
  }
  return 'text-[#1c2b3a]';
}

export function ResultsPublication({
  document,
  published = false,
}: {
  document: ResultsDocument;
  published?: boolean;
}) {
  return (
    <article className="min-h-screen bg-[#f6f3ec] text-[#142033]">
      <header className="bg-[#0d1c30] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 text-[11px] uppercase tracking-[0.22em] text-[#d7c7a2]">
          <span>Bastion Results</span>
          <span>{published ? 'Client publication' : 'Review copy'}</span>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-14 pt-8">
          <p className="text-xs uppercase tracking-[0.18em] text-[#c8a064]">{document.unit}</p>
          <h1 className="mt-3 max-w-4xl font-sans text-4xl font-semibold tracking-tight sm:text-6xl">
            {document.issuer}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[#e7e1d6] sm:text-xl">{document.periodLabel}</p>
        </div>
      </header>

      {document.highlights.length > 0 && (
        <section className="mx-auto -mt-8 grid max-w-6xl gap-3 px-6 sm:grid-cols-2 lg:grid-cols-4">
          {document.highlights.map((highlight) => (
            <div key={`${highlight.label}-${highlight.value}`} className="rounded-2xl border border-[#e4dccb] bg-white px-5 py-5 shadow-sm">
              <p className="text-sm leading-5 text-[#5c5346]">{highlight.label}</p>
              <p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-[#102033]">{highlight.value}</p>
              {highlight.comparison && (
                <p className="mt-2 text-xs leading-5 text-[#5d6b78]">{highlight.comparison}</p>
              )}
            </div>
          ))}
        </section>
      )}

      <div className="mx-auto max-w-6xl space-y-12 px-6 py-12">
        {document.statements.length > 0 && (
          <nav className="flex flex-wrap gap-2">
            {document.statements.filter((statement) => statement.title.length < 92).map((statement) => (
              <a key={statement.id} href={`#${statement.id}`} className="rounded-full border border-[#e4dccb] bg-white px-3 py-1.5 text-xs text-[#3d4d5e] hover:border-[#c8a064]">
                {statement.title}
              </a>
            ))}
          </nav>
        )}

        {document.narrative.length > 0 && (
          <section className="max-w-3xl space-y-4 text-[15px] leading-7 text-[#24384a]">
            {document.narrative.map((paragraph, index) => (
              <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
            ))}
          </section>
        )}

        {!published && document.warnings.length > 0 && (
          <section className="rounded-2xl border border-[#e7c98a] bg-[#fff8ec] px-5 py-4 text-sm text-[#6a4b12]">
            <p className="font-semibold">Figures to check before release</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {document.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </section>
        )}

        {document.statements.map((statement) => (
          <section id={statement.id} key={statement.id} className="scroll-mt-8 overflow-hidden rounded-3xl border border-[#e4dccb] bg-white shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#eee6d8] px-6 py-5">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[#102033]">{statement.title}</h2>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#7b7366]">
                  {[statement.period, document.unit].filter(Boolean).join(' · ')}
                </p>
              </div>
              {!published && (
                <p className="text-xs text-[#6d7c89]">
                  Table confidence {Math.round(statement.confidence * 100)}%
                </p>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-sm">
                <thead>
                  <tr className="bg-[#f7f4ee] text-left text-[11px] uppercase tracking-[0.14em] text-[#5e564a]">
                    <th className="sticky left-0 bg-[#f7f4ee] px-6 py-3 font-semibold">{statement.stubLabel || ' '}</th>
                    {statement.columns.map((column) => (
                      <th key={column.id} className="px-4 py-3 text-right font-semibold">{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statement.rows.map((row) => (
                    <tr key={row.id} className={`border-t border-[#f0ebe2] ${rowClass(row)}`}>
                      {row.kind === 'section' ? (
                        <td colSpan={statement.columns.length + 1} className="px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em]">
                          {row.label}
                        </td>
                      ) : (
                        <>
                          <th className="sticky left-0 bg-inherit px-6 py-3 text-left font-medium">{row.label}</th>
                          {row.cells.map((cell, cellIndex) => (
                            <td key={`${row.id}-${cellIndex}`} className="px-4 py-3 text-right font-mono tabular-nums">
                              {cell || (statement.columns[cellIndex]?.role === 'note' ? '' : '—')}
                            </td>
                          ))}
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {document.notes.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold">Notes</h2>
            <ol className="mt-4 space-y-2 text-sm leading-6 text-[#3d5163]">
              {document.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <footer className="border-t border-[#e4dccb] bg-[#efeae1] px-6 py-8 text-xs leading-5 text-[#5c6b78]">
        <div className="mx-auto max-w-6xl">
          Prepared by Bastion from {document.sourceFilename || 'the source PDF'}.
          {' '}Accounting parentheses show negative amounts. Check every figure against the signed booklet before it is sent to the client.
        </div>
      </footer>
    </article>
  );
}
