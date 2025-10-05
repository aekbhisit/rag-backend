export const transferAgentsSchema = {
  name: 'transferAgents',
  description: 'Transfer conversation to another agent',
  parameters: {
    type: 'object',
    properties: {
      targetAgent: {
        type: 'string',
        description: 'Target agent key to transfer to'
      },
      reason: {
        type: 'string',
        description: 'Reason for the transfer'
      },
      context: {
        type: 'object',
        description: 'Context information to pass to the target agent'
      }
    },
    required: ['targetAgent']
  }
};
