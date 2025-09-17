export const fsWriteTextSchema = {
  name: 'fsWriteText',
  description: 'Write text content to files',
  parameters: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to file to write'
      },
      content: {
        type: 'string',
        description: 'Content to write to the file'
      },
      encoding: {
        type: 'string',
        description: 'File encoding',
        default: 'utf-8'
      },
      append: {
        type: 'boolean',
        description: 'Whether to append to existing file',
        default: false
      }
    },
    required: ['filePath', 'content']
  }
};
