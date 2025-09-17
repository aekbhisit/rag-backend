export const selectItemSchema = {
  name: 'selectItem',
  description: 'Select an item from a list or dropdown',
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS selector for the list or dropdown element'
      },
      index: {
        type: 'number',
        description: 'Index of the item to select',
        default: 0
      },
      value: {
        type: 'string',
        description: 'Value to select (alternative to index)'
      }
    },
    required: ['selector']
  }
};
