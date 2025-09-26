export const variablesSchema = {
  name: 'variables',
  description: 'Manage conversation variables and state',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['get', 'set', 'delete', 'list'],
        description: 'Action to perform on variables'
      },
      key: {
        type: 'string',
        description: 'Variable key (required for get, set, delete actions)'
      },
      value: {
        description: 'Variable value (required for set action)'
      }
    },
    required: ['action']
  }
};
