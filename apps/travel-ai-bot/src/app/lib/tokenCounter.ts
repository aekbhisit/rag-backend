/**
 * Simple token counter utility for GPT models
 * This provides rough token estimation until we integrate tiktoken
 */

export function estimateTokens(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  
  // GPT models roughly use 1 token per 4 characters for English
  // For Thai/Unicode text, it's typically higher (1 token per 2-3 characters)
  // We'll use a conservative estimate
  
  const hasUnicode = /[\u0E00-\u0E7F\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/.test(text);
  const divisor = hasUnicode ? 2.5 : 4; // More tokens for non-English text
  
  // Remove extra whitespace and count
  const cleanText = text.trim().replace(/\s+/g, ' ');
  const estimated = Math.ceil(cleanText.length / divisor);
  
  // Minimum 1 token for non-empty strings
  return Math.max(1, estimated);
}

export function estimateMessageTokens(content: string, role: 'user' | 'assistant' | 'system' = 'user'): {
  content_tokens: number;
  overhead_tokens: number;
  total_tokens: number;
} {
  const contentTokens = estimateTokens(content);
  
  // OpenAI adds overhead tokens for message formatting
  // user/assistant: ~4 tokens overhead, system: ~3 tokens
  const overheadTokens = role === 'system' ? 3 : 4;
  
  return {
    content_tokens: contentTokens,
    overhead_tokens: overheadTokens,
    total_tokens: contentTokens + overheadTokens
  };
}
