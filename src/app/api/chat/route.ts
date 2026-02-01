import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '../../../lib/auth/session';
import { checkRateLimit } from '../../../lib/router/ratelimit';
import { orchestrateStream } from '../../../lib/router/fallback';
import { z } from 'zod';
import { MODELS } from '../../../config/models.config';

const chatSchema = z.object({
  model: z.custom<keyof typeof MODELS>((val) => val in MODELS),
  messages: z.array(z.object({ role: z.enum(['user', 'assistant', 'system']), content: z.string() }))
});

export async function POST(req: NextRequest) {
  const payload = await verifySession();
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const ip = req.headers.get('x-forwarded-for') || 'ip';
  if (!checkRateLimit(ip)) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json();
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });

  const stream = orchestrateStream(parsed.data.model, parsed.data.messages);
  
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        controller.enqueue(new TextEncoder().encode(chunk));
      }
      controller.close();
    }
  });

  return new NextResponse(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
}
