export const filterContentSchema = {
  name: 'filterContent',
  description: 'Filter content based on criteria',
  parameters: {
    type: 'object',
    properties: {
      criteria: {
        type: 'object',
        description: 'Filter criteria object'
      },
      operator: {
        type: 'string',
        enum: ['and', 'or'],
        description: 'Logical operator for combining criteria',
        default: 'and'
      }
    },
    required: ['criteria']
  }
};
