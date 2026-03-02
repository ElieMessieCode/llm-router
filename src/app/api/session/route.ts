import { NextRequest, NextResponse } from 'next/server';
import { createSession, verifySession, secureCompare } from '../../../lib/auth/session';
import { env } from '../../../lib/env';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (secureCompare(code, env.ACCESS_CODE)) {
    await createSession();
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: 'Invalid' }, { status: 401 });
}

export async function GET() {
  const payload = await verifySession();
  if (payload) return NextResponse.json({ success: true });
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  return NextResponse.json({ success: true });
}
