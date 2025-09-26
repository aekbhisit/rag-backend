export const extractContentSchema = {
  name: 'extractContent',
  description: 'Extract specific content from UI elements',
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS selector for the element to extract content from'
      },
      attribute: {
        type: 'string',
        description: 'Attribute to extract (text, href, value, etc.)',
        default: 'text'
      },
      multiple: {
        type: 'boolean',
        description: 'Whether to extract from multiple elements',
        default: false
      }
    },
    required: ['selector']
  }
};
