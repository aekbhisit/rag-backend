import { Tool } from '@/app/types';

export const timeNowSchema: Tool = {
  type: 'function',
  name: 'timeNow',
  description: 'Return the current timestamp and optional formatted time in a timezone.',
  parameters: {
    type: 'object',
    properties: {
      timezone: { type: 'string', description: 'IANA timezone, e.g., Asia/Bangkok' },
      format: { type: 'string', description: 'Optional format string, e.g., ISO, RFC2822' }
    },
    required: []
  }
};
