import crypto from 'crypto';

type VerifySignatureParams = {
  channelSecret: string;
  bodyRaw: string;
  xLineSignature: string | null;
};

export function verifyLineSignature({ channelSecret, bodyRaw, xLineSignature }: VerifySignatureParams): boolean {
  try {
    if (!xLineSignature) return false;
    const hmac = crypto.createHmac('sha256', channelSecret);
    hmac.update(bodyRaw);
    const signature = hmac.digest('base64');
    return signature === xLineSignature;
  } catch {
    return false;
  }
}

type LineTextMessage = {
  type: 'text';
  text: string;
};

type PushMessageParams = {
  channelAccessToken: string;
  to: string;
  messages: LineTextMessage[];
};

export async function pushLineMessage({ channelAccessToken, to, messages }: PushMessageParams) {
  const resp = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({ to, messages })
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`LINE push failed: ${resp.status} ${text}`);
  }
  return resp.json().catch(() => ({}));
}

type ReplyMessageParams = {
  channelAccessToken: string;
  replyToken: string;
  messages: LineTextMessage[];
};

export async function replyLineMessage({ channelAccessToken, replyToken, messages }: ReplyMessageParams) {
  const resp = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({ replyToken, messages })
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`LINE reply failed: ${resp.status} ${text}`);
  }
  return resp.json().catch(() => ({}));
}

export function getLineEnv() {
  const channelId = process.env.LINE_CHANNEL_ID || '';
  const channelSecret = process.env.LINE_CHANNEL_SECRET || '';
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
  return { channelId, channelSecret, channelAccessToken };
}


