/**
 * Skill Schemas Index
 * Skills to extend agent availability
 */

export { knowledgeSearchSchema } from './knowledge-search';
export { webSearchSchema } from './web-search';
export { httpRequestSchema } from './http-request';
export { ragSearchSchema } from './rag-search';
export { ragPlaceSchema } from './rag-place';
export { ragContextsSchema } from './rag-contexts';
export { textSummarizeSchema } from './text-summarize';
export { timeNowSchema } from './time-now';
export { dataParseCSVSchema } from './data-parse-csv';
export { dataParseJSONSchema } from './data-parse-json';
export { fsReadTextSchema } from './fs-read-text';
export { fsWriteTextSchema } from './fs-write-text';
export { webBrowseSchema } from './web-browse';
export { webCrawlSchema } from './web-crawl';

// Export all skill schemas as array
import { knowledgeSearchSchema } from './knowledge-search';
import { webSearchSchema } from './web-search';
import { httpRequestSchema } from './http-request';
import { ragSearchSchema } from './rag-search';
import { ragPlaceSchema } from './rag-place';
import { ragContextsSchema } from './rag-contexts';
import { textSummarizeSchema } from './text-summarize';
import { timeNowSchema } from './time-now';
import { dataParseCSVSchema } from './data-parse-csv';
import { dataParseJSONSchema } from './data-parse-json';
import { fsReadTextSchema } from './fs-read-text';
import { fsWriteTextSchema } from './fs-write-text';
import { webBrowseSchema } from './web-browse';
import { webCrawlSchema } from './web-crawl';

export const SKILL_SCHEMAS = [
  knowledgeSearchSchema,
  webSearchSchema,
  httpRequestSchema,
  ragSearchSchema,
  ragPlaceSchema,
  ragContextsSchema,
  textSummarizeSchema,
  timeNowSchema,
  dataParseCSVSchema,
  dataParseJSONSchema,
  fsReadTextSchema,
  fsWriteTextSchema,
  webBrowseSchema,
  webCrawlSchema,
]; 