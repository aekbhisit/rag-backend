import { Tool } from '@/app/types';

export const textSummarizeSchema: Tool = {
  type: 'function',
  name: 'textSummarize',
  description: 'Summarize a block of text to a concise form.',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Text to summarize' },
      maxTokens: { type: 'number', description: 'Approximate maximum tokens (default 120)' },
      style: { type: 'string', description: 'Optional style (bullet, paragraph)' }
    },
    required: ['text']
  }
};
