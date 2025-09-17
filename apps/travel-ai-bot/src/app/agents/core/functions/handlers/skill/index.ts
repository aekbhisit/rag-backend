/**
 * Skill Handlers Index
 * Skills to extend agent availability
 */


export { webSearchHandler } from './web-search';
export { httpRequestHandler } from './http-request';
export { ragSearchHandler } from './rag-search';
export { textSummarizeHandler } from './text-summarize';
export { timeNowHandler } from './time-now';
export { ragPlaceSearchHandler } from './rag-place';
export { ragContextsHandler } from './rag-contexts';
export { dataParseCSVHandler } from './data-parse-csv';
export { dataParseJSONHandler } from './data-parse-json';
export { fsReadTextHandler } from './fs-read-text';
export { fsWriteTextHandler } from './fs-write-text';
export { webBrowseHandler } from './web-browse';
export { webCrawlHandler } from './web-crawl';
export { weatherHandler } from './weather';

// Export all skill handlers as object
import { webSearchHandler } from './web-search';
import { httpRequestHandler } from './http-request';
import { ragSearchHandler } from './rag-search';
import { textSummarizeHandler } from './text-summarize';
import { timeNowHandler } from './time-now';
import { ragPlaceSearchHandler } from './rag-place';
import { ragContextsHandler } from './rag-contexts';
import { dataParseCSVHandler } from './data-parse-csv';
import { dataParseJSONHandler } from './data-parse-json';
import { fsReadTextHandler } from './fs-read-text';
import { fsWriteTextHandler } from './fs-write-text';
import { webBrowseHandler } from './web-browse';
import { webCrawlHandler } from './web-crawl';
import { weatherHandler } from './weather';

export const SKILL_HANDLERS = {
  webSearch: webSearchHandler,
  httpRequest: httpRequestHandler,
  ragSearch: ragSearchHandler,
  textSummarize: textSummarizeHandler,
  timeNow: timeNowHandler,
  placeRagSearch: ragPlaceSearchHandler,
  // placeKnowledgeSearch alias removed; resolution should be DB-driven
  ragContexts: ragContextsHandler,
  dataParseCSV: dataParseCSVHandler,
  dataParseJSON: dataParseJSONHandler,
  fsReadText: fsReadTextHandler,
  fsWriteText: fsWriteTextHandler,
  webBrowse: webBrowseHandler,
  webCrawl: webCrawlHandler,
  get_weather: weatherHandler,
};

// Provide a registry to resolve by DB skill key (no function-name hardcoding)
export const SKILL_KEY_TO_HANDLER: Record<string, any> = {
  'skill.rag.place': ragPlaceSearchHandler,
  'skill.rag.search': ragSearchHandler,
  'skill.text.summarize': textSummarizeHandler,
  'skill.time.now': timeNowHandler,
  'skill.rag.contexts': ragContextsHandler,
  'skill.data.parse.csv': dataParseCSVHandler,
  'skill.data.parse.json': dataParseJSONHandler,
  'skill.web.search': webSearchHandler,
  'skill.http.request': httpRequestHandler,
  'skill.web.browse': webBrowseHandler,
  'skill.web.crawl': webCrawlHandler,
}; 