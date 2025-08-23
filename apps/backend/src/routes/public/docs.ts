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
            { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Category slug (exact) or name (ILIKE)' },
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
            { name: 'page_size', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
          ],
          responses: {
            '200': { description: 'OK' }
          }
        }
      },
      '/categories': {
        get: {
          summary: 'List categories (hierarchical)',
          parameters: [ { name: 'X-Tenant-ID', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } } ],
          responses: { '200': { description: 'OK' } }
        },
        post: {
          summary: 'Create category',
          parameters: [ { name: 'X-Tenant-ID', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } } ],
          requestBody: { required: true, content: { 'application/json': { schema: {
            type: 'object', properties: {
              name: { type: 'string' }, slug: { type: 'string' }, description: { type: 'string' }, parent_id: { type: 'string', format: 'uuid' }, sort_order: { type: 'integer' }, metadata: { type: 'object', additionalProperties: true }
            }, required: ['name','slug']
          } } } },
          responses: { '201': { description: 'Created' } }
        }
      },
      '/intent/scopes': {
        get: {
          summary: 'List intent scopes',
          parameters: [ { name: 'X-Tenant-ID', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } } ],
          responses: { '200': { description: 'OK' } }
        },
        post: {
          summary: 'Create intent scope',
          parameters: [ { name: 'X-Tenant-ID', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } } ],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, slug: { type: 'string' }, description: { type: 'string' } }, required: ['name','slug'] } } } },
          responses: { '201': { description: 'Created' } }
        }
      },
      '/intent/actions': {
        get: {
          summary: 'List intent actions',
          parameters: [ { name: 'X-Tenant-ID', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } }, { name: 'scope_id', in: 'query', schema: { type: 'string', format: 'uuid' } } ],
          responses: { '200': { description: 'OK' } }
        },
        post: {
          summary: 'Create intent action',
          parameters: [ { name: 'X-Tenant-ID', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } } ],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { scope_id: { type: 'string', format: 'uuid' }, name: { type: 'string' }, slug: { type: 'string' }, description: { type: 'string' } }, required: ['scope_id','name','slug'] } } } },
          responses: { '201': { description: 'Created' } }
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
      ,
      '/admin/categories': {
        get: {
          summary: 'Admin: List categories',
          parameters: [
            { name: 'X-Tenant-ID', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'hierarchy', in: 'query', schema: { type: 'string', enum: ['true','false'], default: 'false' } }
          ],
          responses: { '200': { description: 'OK' } }
        }
      },
      '/admin/intent-system/scopes': {
        get: {
          summary: 'Admin: List intent scopes',
          parameters: [ { name: 'X-Tenant-ID', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } } ],
          responses: { '200': { description: 'OK' } }
        }
      },
      '/admin/intent-system/actions': {
        get: {
          summary: 'Admin: List intent actions',
          parameters: [
            { name: 'X-Tenant-ID', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'scope_id', in: 'query', required: false, schema: { type: 'string', format: 'uuid' }, description: 'Optional: filter actions by scope id' }
          ],
          responses: { '200': { description: 'OK' } }
        }
      },
      '/admin/intent-system/scopes-with-actions': {
        get: {
          summary: 'Admin: List intent scopes with their actions',
          parameters: [ { name: 'X-Tenant-ID', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } } ],
          responses: { '200': { description: 'OK' } }
        }
      },
      
      '/admin/contexts/import': {
        post: {
          summary: 'Admin: Import context (all fields, optional embedding)',
          description: 'Choose a type and provide attributes that match that type. Each variant includes an example template.',
          parameters: [ { name: 'X-Tenant-ID', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } } ],
          requestBody: { required: true, content: { 'application/json': { schema: {
            oneOf: [
              {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  type: { type: 'string', enum: ['text'] },
                  title: { type: 'string' },
                  body: { type: 'string' },
                  instruction: { type: 'string' },
                  attributes: {
                    type: 'object',
                    properties: {
                      source: { type: 'string' },
                      imported_at: { type: 'string' }
                    },
                    additionalProperties: true
                  },
                  trust_level: { type: 'integer', minimum: 0, maximum: 10 },
                  language: { type: 'string' },
                  status: { type: 'string' },
                  keywords: { anyOf: [ { type: 'array', items: { type: 'string' } }, { type: 'string', description: 'comma separated' } ] },
                  categories: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  intent_scopes: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  intent_actions: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  embedding: { type: 'array', items: { type: 'number' } },
                  latitude: { type: 'number' },
                  longitude: { type: 'number' },
                  created_at: { type: 'string' },
                  updated_at: { type: 'string' }
                },
                required: ['type','title','body','attributes','trust_level'],
                example: {
                  id: '2f1c59a1-1111-2222-3333-444444444444',
                  type: 'text',
                  title: 'Sample Text',
                  body: 'Body content',
                  instruction: 'Optional',
                  attributes: { source: 'manual', imported_at: '2024-01-01T00:00:00Z' },
                  trust_level: 3,
                  language: 'en',
                  status: 'active',
                  keywords: ['tag1','tag2'],
                  categories: [],
                  intent_scopes: [],
                  intent_actions: [],
                  embedding: [0.11, 0.22, 0.33],
                  latitude: 13.7563,
                  longitude: 100.5018,
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-01T00:00:00Z'
                }
              },
              {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  type: { type: 'string', enum: ['document'] },
                  title: { type: 'string' },
                  body: { type: 'string' },
                  instruction: { type: 'string' },
                  attributes: {
                    type: 'object',
                    properties: {
                      source_uri: { type: 'string' },
                      filename: { type: 'string' },
                      file_type: { type: 'string' },
                      pages: { type: 'integer' },
                      imported_at: { type: 'string' }
                    },
                    additionalProperties: true
                  },
                  trust_level: { type: 'integer', minimum: 0, maximum: 10 },
                  language: { type: 'string' },
                  status: { type: 'string' },
                  keywords: { anyOf: [ { type: 'array', items: { type: 'string' } }, { type: 'string' } ] },
                  categories: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  intent_scopes: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  intent_actions: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  embedding: { type: 'array', items: { type: 'number' } },
                  latitude: { type: 'number' },
                  longitude: { type: 'number' },
                  created_at: { type: 'string' },
                  updated_at: { type: 'string' }
                },
                required: ['type','title','body','attributes','trust_level'],
                example: {
                  id: '2f1c59a1-aaaa-bbbb-cccc-444444444444',
                  type: 'document',
                  title: 'PDF: Safety Manual',
                  body: 'Extracted markdown content',
                  instruction: 'Summarize safety instructions at the end',
                  attributes: { source_uri: 'https://example.com/file.pdf', filename: 'file.pdf', file_type: 'PDF Document', pages: 12, imported_at: '2024-01-01T00:00:00Z' },
                  trust_level: 5,
                  language: 'en',
                  status: 'active',
                  keywords: ['safety','manual'],
                  categories: [],
                  intent_scopes: [],
                  intent_actions: [],
                  embedding: [0.1, 0.2, 0.3],
                  latitude: 13.73,
                  longitude: 100.49,
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-02T08:00:00Z'
                }
              },
              {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  type: { type: 'string', enum: ['website'] },
                  title: { type: 'string' },
                  body: { type: 'string' },
                  instruction: { type: 'string' },
                  attributes: {
                    type: 'object',
                    properties: {
                      source_uri: { type: 'string' },
                      favicon_uri: { type: 'string' },
                      html_title: { type: 'string' },
                      imported_at: { type: 'string' }
                    },
                    additionalProperties: true
                  },
                  trust_level: { type: 'integer', minimum: 0, maximum: 10 },
                  language: { type: 'string' },
                  status: { type: 'string' },
                  keywords: { anyOf: [ { type: 'array', items: { type: 'string' } }, { type: 'string' } ] },
                  categories: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  intent_scopes: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  intent_actions: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  embedding: { type: 'array', items: { type: 'number' } },
                  latitude: { type: 'number' },
                  longitude: { type: 'number' },
                  created_at: { type: 'string' },
                  updated_at: { type: 'string' }
                },
                required: ['type','title','body','attributes','trust_level'],
                example: {
                  id: '2f1c59a1-dddd-eeee-ffff-444444444444',
                  type: 'website',
                  title: 'Example Home',
                  body: 'Markdown content from page',
                  instruction: 'Keep links as markdown list at the end',
                  attributes: { source_uri: 'https://example.com', favicon_uri: 'https://example.com/favicon.ico', html_title: 'Example Domain', imported_at: '2024-01-01T00:00:00Z' },
                  trust_level: 4,
                  language: 'en',
                  status: 'active',
                  keywords: ['web','landing'],
                  categories: [],
                  intent_scopes: [],
                  intent_actions: [],
                  embedding: [0.1, 0.2, 0.3],
                  latitude: 13.70,
                  longitude: 100.51,
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-01T00:00:00Z'
                }
              },
              {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  type: { type: 'string', enum: ['place'] },
                  title: { type: 'string' },
                  body: { type: 'string' },
                  instruction: { type: 'string' },
                  attributes: {
                    type: 'object',
                    properties: {
                      address: { type: 'string' },
                      lat: { type: 'number' },
                      long: { type: 'number' },
                      phone: { type: 'string' },
                      opening_hours: { type: 'array', items: { type: 'string' } },
                      rating: { type: 'number' },
                      source_uri: { type: 'string' },
                      google_place_id: { type: 'string' },
                      imported_at: { type: 'string' }
                    },
                    additionalProperties: true
                  },
                  trust_level: { type: 'integer', minimum: 0, maximum: 10 },
                  language: { type: 'string' },
                  status: { type: 'string' },
                  keywords: { anyOf: [ { type: 'array', items: { type: 'string' } }, { type: 'string' } ] },
                  categories: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  intent_scopes: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  intent_actions: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  embedding: { type: 'array', items: { type: 'number' } },
                  latitude: { type: 'number' },
                  longitude: { type: 'number' },
                  created_at: { type: 'string' },
                  updated_at: { type: 'string' }
                },
                required: ['type','title','body','attributes','trust_level'],
                example: {
                  id: '2f1c59a1-9999-8888-7777-444444444444',
                  type: 'place',
                  title: 'Cafe ABC',
                  body: 'Cozy cafe with great coffee.',
                  instruction: 'Highlight opening hours and contact first',
                  attributes: { address: '123 Main St', lat: 13.7563, long: 100.5018, phone: '+66 2 123 4567', opening_hours: ['Mon-Fri 9:00-18:00'], rating: 4.5, source_uri: 'https://maps.google.com/?cid=...', google_place_id: 'ChIJ...', imported_at: '2024-01-01T00:00:00Z' },
                  trust_level: 5,
                  language: 'th',
                  status: 'active',
                  keywords: ['cafe','coffee'],
                  categories: [],
                  intent_scopes: [],
                  intent_actions: [],
                  embedding: [0.05, 0.07, 0.09],
                  latitude: 13.7563,
                  longitude: 100.5018,
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-01T00:00:00Z'
                }
              },
              {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  type: { type: 'string', enum: ['ticket'] },
                  title: { type: 'string' },
                  body: { type: 'string' },
                  instruction: { type: 'string' },
                  attributes: {
                    type: 'object',
                    properties: {
                      ticket_id: { type: 'string' },
                      created_at: { type: 'string' },
                      customer_name: { type: 'string' },
                      customer_email: { type: 'string' },
                      status: { type: 'string' },
                      priority: { type: 'string' },
                      channel: { type: 'string' },
                      tags: { type: 'array', items: { type: 'string' } },
                      imported_at: { type: 'string' }
                    },
                    additionalProperties: true
                  },
                  trust_level: { type: 'integer', minimum: 0, maximum: 10 },
                  language: { type: 'string' },
                  status: { type: 'string' },
                  keywords: { anyOf: [ { type: 'array', items: { type: 'string' } }, { type: 'string' } ] },
                  categories: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  intent_scopes: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  intent_actions: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  embedding: { type: 'array', items: { type: 'number' } },
                  latitude: { type: 'number' },
                  longitude: { type: 'number' },
                  created_at: { type: 'string' },
                  updated_at: { type: 'string' }
                },
                required: ['type','title','body','attributes','trust_level'],
                example: {
                  id: '2f1c59a1-1212-3434-5656-787878787878',
                  type: 'ticket',
                  title: 'Refund request',
                  body: 'Customer requests refund for order #1234',
                  instruction: 'Summarize issue and next steps',
                  attributes: { ticket_id: 'TICK-123', created_at: '2024-01-01T00:00:00Z', customer_name: 'John Doe', customer_email: 'john@example.com', status: 'open', priority: 'high', channel: 'email', tags: ['refund','billing'] },
                  trust_level: 2,
                  language: 'en',
                  status: 'open',
                  keywords: ['refund','support'],
                  categories: [],
                  intent_scopes: [],
                  intent_actions: [],
                  embedding: [0.2, 0.15, 0.05],
                  latitude: 0,
                  longitude: 0,
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-01T00:00:00Z'
                }
              }
            ]
          } } } },
          responses: { '201': { description: 'Created' } }
        }
      }
    }
  } as const;

  router.get('/docs/openapi.json', (_req, res) => {
    res.json(openapi);
  });

  router.get('/docs', (_req, res) => {
    const txt = `RAG Backend Public API\n\nBase URL\n- /api\n\nAuth / Tenanting\n- Include X-Tenant-ID header with your tenant UUID (or default).\n\nEndpoints\n\nGET /api/contexts\n- Headers: X-Tenant-ID\n- Query: q, type, intent_scope, intent_action, status, page, page_size\n- Use to list/search contexts.\n\nGET /api/contexts/{id}\n- Headers: X-Tenant-ID\n- Path: id (uuid)\n\nPOST /api/rag/summary\n- Headers: X-Tenant-ID\n- Body JSON: {\n  conversation_history?: string,\n  text_query: string,\n  simantic_query?: string,\n  intent_scope?: string,\n  intent_action?: string,\n  category?: string,\n  top_k?: number,\n  min_score?: number,\n  fulltext_weight?: number,\n  semantic_weight?: number,\n  prompt_key?: string,\n  prompt_params?: object\n}\n- Returns: summary answer + contexts.\n\nPOST /api/rag/place\n- Headers: X-Tenant-ID\n- Body JSON: {\n  text_query: string, lat: number, long: number,\n  conversation_history?: string, simantic_query?: string, intent_scope?: string, intent_action?: string, category?: string,\n  max_distance_km?: number, distance_weight?: number, top_k?: number, min_score?: number,\n  fulltext_weight?: number, semantic_weight?: number, prompt_key?: string, prompt_params?: object\n}\n- Returns: contexts with distance and optional generated answer.\n\nPOST /api/rag/contexts\n- Headers: X-Tenant-ID\n- Body JSON: same structure as /api/rag/summary (without lat/long)\n\nAdmin (requires backend auth if enabled)\nPOST /api/admin/contexts/import\n- Headers: X-Tenant-ID, Content-Type: application/json\n- Body: context object (type one of: text|document|website|place|ticket). See /api/docs/openapi.json for full schema and examples.\n\nNotes for Agents\n- Always send header: X-Tenant-ID\n- Respect rate limiting; exponential backoff on 429/503\n- Prefer POST /api/rag/summary for general Q&A; use /api/rag/place when location-aware.\n\nFull OpenAPI\n- GET /api/docs/openapi.json\n`;
    res.type('text/plain').send(txt);
  });

  return router;
}


