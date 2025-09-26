import { NextRequest, NextResponse } from 'next/server';
import { getLineEnv, replyLineMessage, verifyLineSignature } from '@/app/lib/lineClient';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    const signature = req.headers.get('x-line-signature');
    const { channelSecret, channelAccessToken } = getLineEnv();
    if (!channelSecret || !channelAccessToken) {
      return NextResponse.json({ error: 'LINE not configured' }, { status: 500 });
    }
    const ok = verifyLineSignature({ channelSecret, bodyRaw: raw, xLineSignature: signature });
    if (!ok) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(raw || '{}');
    const events = Array.isArray(body.events) ? body.events : [];

    // Process each message event
    for (const ev of events) {
      if (ev.type === 'message' && ev.message?.type === 'text') {
        const userText: string = ev.message.text || '';
        const replyToken: string = ev.replyToken;
        const userId: string | undefined = ev.source?.userId;

        // Call our agent-completions to generate a response
        try {
          const base = process.env.NEXT_PUBLIC_BASE_URL 
            || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
          const agentReq = await fetch(`${base}/api/chat/agent-completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'gpt-4o',
              agentName: 'welcomeAgent',
              agentSetKey: 'default',
              sessionId: userId || 'line-session',
              channel: 'line',
              messages: [
                { role: 'system', content: 'You are responding to a user on LINE. Keep replies concise.' },
                { role: 'user', content: userText }
              ],
              temperature: 0.7, max_tokens: 600
            })
          });
          let replyText = 'Sorry, I could not generate a response.';
          if (agentReq.ok) {
            const agentData = await agentReq.json();
            const content = agentData?.choices?.[0]?.message?.content;
            if (typeof content === 'string' && content.trim()) replyText = content.trim();
          }

          await replyLineMessage({ channelAccessToken, replyToken, messages: [ { type: 'text', text: replyText } ] });
        } catch (err) {
          // Fallback minimal reply to avoid webhook retry storms
          try {
            await replyLineMessage({ channelAccessToken, replyToken, messages: [ { type: 'text', text: 'Sorry, something went wrong.' } ] });
          } catch {}
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unhandled error' }, { status: 500 });
  }
}


