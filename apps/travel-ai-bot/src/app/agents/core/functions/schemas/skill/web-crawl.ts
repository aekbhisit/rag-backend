export const webCrawlSchema = {
  name: 'webCrawl',
  description: 'Crawl multiple web pages systematically',
  parameters: {
    type: 'object',
    properties: {
      startUrl: {
        type: 'string',
        description: 'Starting URL for crawling'
      },
      maxPages: {
        type: 'number',
        description: 'Maximum pages to crawl',
        default: 10
      },
      selectors: {
        type: 'array',
        items: { type: 'string' },
        description: 'CSS selectors for content extraction'
      }
    },
    required: ['startUrl']
  }
};
