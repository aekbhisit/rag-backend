export const dataParseJSONSchema = {
  name: 'dataParseJSON',
  description: 'Parse JSON data and validate structure',
  parameters: {
    type: 'object',
    properties: {
      jsonData: {
        type: 'string',
        description: 'JSON data to parse'
      },
      schema: {
        type: 'object',
        description: 'JSON schema for validation'
      },
      strict: {
        type: 'boolean',
        description: 'Strict parsing mode',
        default: false
      }
    },
    required: ['jsonData']
  }
};
