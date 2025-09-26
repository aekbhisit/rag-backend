export const webBrowseSchema = {
  name: 'webBrowse',
  description: 'Browse web pages and extract content',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to browse'
      },
      selector: {
        type: 'string',
        description: 'CSS selector for content extraction'
      },
      waitFor: {
        type: 'string',
        description: 'Element to wait for before extracting content'
      }
    },
    required: ['url']
  }
};
