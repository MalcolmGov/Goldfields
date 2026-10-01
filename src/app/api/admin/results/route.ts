import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { listResultsDocuments } from '@/lib/results/store';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const documents = await listResultsDocuments();
  return NextResponse.json({ documents });
}
