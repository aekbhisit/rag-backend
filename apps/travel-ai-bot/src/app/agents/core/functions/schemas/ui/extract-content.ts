export const extractContentSchema = {
  name: 'extractContent',
  description: 'Extract structured content from the current screen (lists/cards/details) so you can answer or decide next steps. Use when user refers to items like "first package".',
  parameters: {
    type: 'object',
    properties: {
      scope: {
        type: 'string',
        description: "Logical area, e.g., 'tours', 'places', 'taxi', 'help'"
      },
      limit: {
        type: 'number',
        description: 'Max items to return (default 10)'
      },
      detail: {
        type: 'boolean',
        description: 'Include detailed fields where available'
      }
    },
    required: ['scope']
  }
};
