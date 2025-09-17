import { Tool } from '@/app/types';

export const httpRequestSchema: Tool = {
  type: 'function',
  name: 'httpRequest',
  description: 'Perform an HTTP request to a whitelisted domain with method, url and optional body.',
  parameters: {
    type: 'object',
    properties: {
      method: { type: 'string', enum: ['GET','POST','PUT','PATCH','DELETE'] },
      url: { type: 'string', description: 'Absolute URL (must be in allowlist)' },
      headers: { type: 'object', additionalProperties: { type: 'string' } },
      body: { type: 'string', description: 'Raw request body (JSON recommended)' },
      timeoutMs: { type: 'number', description: 'Max request time in ms (default 8000)' }
    },
    required: ['method','url']
  }
};
