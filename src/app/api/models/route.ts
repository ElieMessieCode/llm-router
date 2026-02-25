import { NextResponse } from 'next/server';
import { verifySession } from '../../../lib/auth/session';
import { MODELS } from '../../../config/models.config';

export async function GET() {
  const payload = await verifySession();
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ models: Object.keys(MODELS) });
}
