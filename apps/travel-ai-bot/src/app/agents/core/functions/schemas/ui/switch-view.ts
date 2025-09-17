export const switchViewSchema = {
  name: 'switchView',
  description: 'Switch between different UI views or modes',
  parameters: {
    type: 'object',
    properties: {
      view: {
        type: 'string',
        description: 'Name of the view to switch to'
      },
      params: {
        type: 'object',
        description: 'Additional parameters for the view'
      }
    },
    required: ['view']
  }
};
