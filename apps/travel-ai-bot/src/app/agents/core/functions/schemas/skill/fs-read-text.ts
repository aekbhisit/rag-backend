export const fsReadTextSchema = {
  name: 'fsReadText',
  description: 'Read text content from files',
  parameters: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to file to read'
      },
      encoding: {
        type: 'string',
        description: 'File encoding',
        default: 'utf-8'
      },
      maxSize: {
        type: 'number',
        description: 'Maximum file size in bytes',
        default: 1048576
      }
    },
    required: ['filePath']
  }
};
