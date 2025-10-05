export const toastSchema = {
  name: 'toast',
  description: 'Show toast notification to user',
  parameters: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'Notification message to display'
      },
      type: {
        type: 'string',
        enum: ['info', 'success', 'warning', 'error'],
        description: 'Type of notification',
        default: 'info'
      },
      duration: {
        type: 'number',
        description: 'Display duration in milliseconds',
        default: 3000
      }
    },
    required: ['message']
  }
};
