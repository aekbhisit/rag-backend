import { NextRequest, NextResponse } from 'next/server';
import { putUiToolResult } from '@/app/lib/textstream/sessionEvents';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const key: string = String(body?.key || '');
    if (!key) return NextResponse.json({ error: 'missing key' }, { status: 400 });
    try { console.log('[UI:tool-result] ▶ received', { key, preview: JSON.stringify(body?.result || {}).slice(0, 500) }); } catch {}
    putUiToolResult(key, body?.result ?? null);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server error' }, { status: 500 });
  }
}


