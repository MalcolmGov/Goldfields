import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ResultsPublication } from '@/components/results/ResultsPublication';
import { getPublishedResultsBySlug } from '@/lib/results/store';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const stored = await getPublishedResultsBySlug(slug);
  if (!stored) return { title: 'Results' };
  return {
    title: stored.title,
    description: `${stored.document.issuer}. ${stored.document.periodLabel}`,
    robots: 'noindex, nofollow',
  };
}

export default async function PublishedResultsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const stored = await getPublishedResultsBySlug(slug);
  if (!stored) notFound();
  return <ResultsPublication document={stored.document} published />;
}
