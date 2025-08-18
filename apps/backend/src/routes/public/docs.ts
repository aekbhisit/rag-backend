import { Router } from 'express';

export function buildDocsRouter() {
  const router = Router();

  const openapi = {
    openapi: '3.0.3',
    info: {
      title: 'RAG Backend Public API',
      version: '0.1.0',
      description: 'Public endpoints for context retrieval and RAG summarization.'
    },
    servers: [
      { url: '/api' }
    ],
    paths: {
      '/contexts': {
        get: {
          summary: 'List/search contexts',
          parameters: [
            { name: 'X-Tenant-ID', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'q', in: 'query', schema: { type: 'string' } },
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['place','website','ticket','document','text'] } },
            { name: 'intent_scope', in: 'query', schema: { type: 'string' } },
            { name: 'intent_action', in: 'query', schema: { type: 'string' } },
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
            { name: 'page_size', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
          ],
          responses: {
            '200': { description: 'OK' }
          }
        }
      },
      '/contexts/{id}': {
        get: {
          summary: 'Get context by id',
          parameters: [
            { name: 'X-Tenant-ID', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
          ],
          responses: { '200': { description: 'OK' }, '404': { description: 'Not Found' } }
        }
      },
      '/rag/summary': {
        post: {
          summary: 'RAG summary (hybrid search with weights)',
          parameters: [ { name: 'X-Tenant-ID', in: 'header', required: true, schema: { type: 'string' } } ],
          requestBody: { required: true, content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              conversation_history: { type: 'string', description: 'Optional summarized conversation text' },
              text_query: { type: 'string' },
              simantic_query: { type: 'string', description: 'Optional semantic augment text' },
              intent_scope: { type: 'string' },
              intent_action: { type: 'string' },
              category: { type: 'string', description: 'Category slug or name to filter' },
              top_k: { type: 'integer', default: 3 },
              min_score: { type: 'number', default: 0.5 },
              fulltext_weight: { type: 'number', default: 0.5 },
              semantic_weight: { type: 'number', default: 0.5 },
              prompt_key: { type: 'string', description: 'Key of prompt template configured in tenant settings or DB' },
              prompt_params: { type: 'object', additionalProperties: true, description: 'Extra variables to inject into the prompt template' }
            }, required: ['text_query']
          } } } },
          responses: { '200': { description: 'OK' } }
        }
      },
      '/rag/place': {
        post: {
          summary: 'RAG place search (hybrid + distance)',
          description: 'Search nearby places (type=place) by combining vector, full-text, and distance weighting. Returns both contexts (with distance_km) and places list, and can generate an answer.',
          parameters: [ { name: 'X-Tenant-ID', in: 'header', required: true, schema: { type: 'string' } } ],
          requestBody: { required: true, content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              conversation_history: { type: 'string' },
              text_query: { type: 'string' },
              simantic_query: { type: 'string' },
              intent_scope: { type: 'string' },
              intent_action: { type: 'string' },
              category: { type: 'string' },
              lat: { type: 'number', description: 'Current latitude' },
              long: { type: 'number', description: 'Current longitude' },
              max_distance_km: { type: 'number', default: 5 },
              distance_weight: { type: 'number', minimum: 0, maximum: 1, default: 1 },
              top_k: { type: 'integer', default: 3 },
              min_score: { type: 'number', default: 0.5 },
              fulltext_weight: { type: 'number', default: 0.5 },
              semantic_weight: { type: 'number', default: 0.5 },
              prompt_key: { type: 'string' },
              prompt_params: { type: 'object', additionalProperties: true }
            }, required: ['text_query','lat','long']
          } } } },
          responses: { '200': { description: 'OK' } }
        }
      },
      '/rag/contexts': {
        post: {
          summary: 'RAG contexts (summary-first or raw)',
          parameters: [ { name: 'X-Tenant-ID', in: 'header', required: true, schema: { type: 'string' } } ],
          requestBody: { required: true, content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              conversation_history: { type: 'string' },
              text_query: { type: 'string' },
              simantic_query: { type: 'string' },
              intent_scope: { type: 'string' },
              intent_action: { type: 'string' },
              category: { type: 'string' },
              top_k: { type: 'integer', default: 3 },
              min_score: { type: 'number', default: 0.5 },
              fulltext_weight: { type: 'number', default: 0.5 },
              semantic_weight: { type: 'number', default: 0.5 },
              prompt_key: { type: 'string', description: 'Key of prompt template configured in tenant settings or DB' },
              prompt_params: { type: 'object', additionalProperties: true, description: 'Extra variables to inject into the prompt template' }
            }, required: ['text_query']
          } } } },
          responses: { '200': { description: 'OK' } }
        }
      }
    }
  } as const;

  router.get('/docs/openapi.json', (_req, res) => {
    res.json(openapi);
  });

  router.get('/docs', (_req, res) => {
    res.type('text/plain').send('See /api/docs/openapi.json for OpenAPI spec.');
  });

  return router;
}


