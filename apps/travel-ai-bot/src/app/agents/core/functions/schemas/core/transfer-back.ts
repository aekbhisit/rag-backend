export const transferBackSchema = {
  name: 'transferBack',
  description: 'Transfer conversation back to previous agent',
  parameters: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description: 'Reason for transferring back'
      },
      summary: {
        type: 'string',
        description: 'Summary of the current conversation state'
      }
    }
  }
};
