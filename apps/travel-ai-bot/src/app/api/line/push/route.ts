import { NextRequest, NextResponse } from 'next/server';
import { getLineEnv, pushLineMessage } from '@/app/lib/lineClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, text } = body || {};
    const { channelAccessToken } = getLineEnv();
    if (!channelAccessToken) return NextResponse.json({ error: 'LINE not configured' }, { status: 500 });
    const resolvedTo = to || process.env.LINE_DEFAULT_TO;
    if (!resolvedTo || !text) return NextResponse.json({ error: 'Missing to or text' }, { status: 400 });

    await pushLineMessage({ channelAccessToken, to: resolvedTo, messages: [{ type: 'text', text: String(text) }] });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unhandled error' }, { status: 500 });
  }
}


