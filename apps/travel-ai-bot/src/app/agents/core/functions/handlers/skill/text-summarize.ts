export const textSummarizeHandler = async (args: any) => {
  const { text, maxTokens = 120, maxLength, style = 'paragraph' } = args || {};
  if (!text) return { success: false, error: 'text_required' };
  // Compute character limit: prefer explicit maxLength, else derive from tokens
  const tokenDerived = Math.max(60, Math.min(800, maxTokens * 4));
  const limit = typeof maxLength === 'number' ? Math.max(20, Math.min(2000, maxLength)) : tokenDerived;
  const summary = text.length > limit ? text.slice(0, limit) + '…' : text;
  const payload = style === 'bullet'
    ? summary.split(/\n+/).slice(0, 6).map((s: string) => s.trim()).filter(Boolean)
    : summary;
  return { success: true, summary: payload };
};
