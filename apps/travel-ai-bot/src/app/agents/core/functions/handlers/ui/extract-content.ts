export async function extractContentHandler(params: {
  scope?: string;
  limit?: number;
  detail?: boolean;
}) {
  try {
    // Prefer Bot Action Framework handler if registered by the page (DB-driven behavior parity)
    try {
      const { handleFunctionCall } = await import('@/botActionFramework');
      const result = await handleFunctionCall({
        name: 'extractContent',
        arguments: JSON.stringify({
          scope: params?.scope,
          limit: params?.limit,
          detail: params?.detail
        })
      } as any);
      // If a page-level handler returns useful data/blocks, use it
      const hasUseful = result && result.success === true && (
        (Array.isArray((result as any).data) && (result as any).data.length > 0) ||
        (Array.isArray((result as any).blocks) && (result as any).blocks.length > 0)
      );
      if (hasUseful) return result;
    } catch {}

    // Fallback: client-side DOM extraction within .ai-extract-scope or document.body
    const scopeRoot = document.querySelector('.ai-extract-scope') || document.body;
    const blocks: Array<{ type: string; text?: string; items?: string[] }> = [];
    const walker = document.createTreeWalker(scopeRoot, NodeFilter.SHOW_ELEMENT);
    const items: string[] = [];
    const texts: string[] = [];
    while (walker.nextNode()) {
      const el = walker.currentNode as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (["script","style","noscript"].includes(tag)) continue;
      if (["h1","h2","h3","h4","h5","h6"].includes(tag)) {
        const t = el.textContent?.trim(); if (t) blocks.push({ type: 'heading', text: t });
      } else if (tag === 'li') {
        const t = el.textContent?.trim(); if (t) items.push(t);
      } else if (tag === 'table') {
        try {
          const rows: string[] = [];
          (el as HTMLTableElement).querySelectorAll('tr').forEach(tr => {
            const cells = Array.from(tr.querySelectorAll('th,td')).map(td => (td.textContent||'').trim()).filter(Boolean);
            if (cells.length) rows.push(cells.join(' | '));
          });
          if (rows.length) blocks.push({ type: 'table', items: rows });
        } catch {}
      } else if (tag === 'dl') {
        try {
          const pairs: string[] = [];
          const dts = Array.from(el.querySelectorAll('dt'));
          const dds = Array.from(el.querySelectorAll('dd'));
          const len = Math.max(dts.length, dds.length);
          for (let i=0;i<len;i++) {
            const k = (dts[i]?.textContent||'').trim();
            const v = (dds[i]?.textContent||'').trim();
            if (k || v) pairs.push(`${k}: ${v}`.trim());
          }
          if (pairs.length) blocks.push({ type: 'definition_list', items: pairs });
        } catch {}
      } else if (["p","div","section","article"].includes(tag)) {
        const t = el.textContent?.trim(); if (t && t.length > 0 && t.length < 2000) texts.push(t);
      }
    }
    if (items.length) blocks.push({ type: 'list', items });
    const limit = typeof params?.limit === 'number' ? Math.max(1, Math.floor(params.limit as number)) : 20;
    texts.slice(0, limit).forEach(t => blocks.push({ type: 'text', text: t }));
    return { success: true, scope: params?.scope || null, blocks } as any;
  } catch (e: any) {
    return { success: false, error: e?.message || 'extractContent handler failed' } as any;
  }
}
