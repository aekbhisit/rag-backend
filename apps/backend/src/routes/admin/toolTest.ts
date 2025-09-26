import { Router } from 'express';
import type { Pool } from 'pg';
import { getPostgresPool } from '../../adapters/db/postgresClient';

export function buildToolTestAdminRouter(pool: Pool) {
  const router = Router();
  const pg = pool || getPostgresPool();

  // Test tool execution using skill handlers
  router.post('/tool-test/execute', async (req, res) => {
    try {
      const { toolId, testParams, toolConfig } = req.body;
      
      if (!toolId || !testParams) {
        return res.status(400).json({ error: 'toolId and testParams are required' });
      }

      let tool;
      
      // Check if this is a temporary tool config (from add tool page)
      if (toolConfig && toolId.startsWith('temp-')) {
        tool = {
          id: toolId,
          tool_key: toolConfig.tool_key,
          function_name: toolConfig.function_name,
          parameter_mapping: toolConfig.parameter_mapping,
          arg_defaults: toolConfig.arg_defaults,
          overrides: toolConfig.overrides,
          tool_name: toolConfig.function_name,
          tool_description: 'Temporary tool for testing'
        };
      } else {
        // Get tool configuration from database
        const toolQuery = await pg.query(`
          SELECT 
            at.*,
            tr.name as tool_name,
            at.function_description as tool_description
          FROM agent_tools at
          LEFT JOIN tool_registry tr ON at.tool_key = tr.tool_key
          WHERE at.id = $1
        `, [toolId]);

        if (toolQuery.rows.length === 0) {
          return res.status(404).json({ error: 'Tool not found' });
        }

        tool = toolQuery.rows[0];
      }
      
      // Apply parameter mapping
      let mappedParams = { ...testParams };
      if (tool.parameter_mapping) {
        const mapping = typeof tool.parameter_mapping === 'string' 
          ? JSON.parse(tool.parameter_mapping) 
          : tool.parameter_mapping;
        
        mappedParams = {};
        for (const [aiParam, toolParam] of Object.entries(mapping)) {
          if (aiParam in testParams) {
            mappedParams[toolParam] = testParams[aiParam];
          }
        }
      }

      // Execute skill handler based on tool_key
      let result;
      const startTime = Date.now();
      
      try {
        switch (tool.tool_key) {
          case 'skill.rag.place':
            result = await executeRagPlaceHandler(mappedParams, tool);
            break;
          case 'skill.rag.search':
            result = await executeRagSearchHandler(mappedParams, tool);
            break;
          case 'skill.http.request':
            result = await executeHttpRequestHandler(mappedParams, tool);
            break;
          case 'skill.text.summarize':
            result = await executeTextSummarizeHandler(mappedParams, tool);
            break;
          case 'skill.time.now':
            result = await executeTimeNowHandler(mappedParams, tool);
            break;
          case 'skill.web.search':
            result = await executeWebSearchHandler(mappedParams, tool);
            break;
          case 'skill.rag.contexts':
            result = await executeRagContextsHandler(mappedParams, tool);
            break;
          case 'skill.data.parse.csv':
            result = await executeDataParseCSVHandler(mappedParams, tool);
            break;
          case 'skill.data.parse.json':
            result = await executeDataParseJSONHandler(mappedParams, tool);
            break;
          case 'skill.fs.read.text':
            result = await executeFsReadTextHandler(mappedParams, tool);
            break;
          case 'skill.fs.write.text':
            result = await executeFsWriteTextHandler(mappedParams, tool);
            break;
          case 'skill.web.browse':
            result = await executeWebBrowseHandler(mappedParams, tool);
            break;
          case 'skill.web.crawl':
            result = await executeWebCrawlHandler(mappedParams, tool);
            break;
          default:
            result = {
              success: false,
              error: `Skill handler not implemented for tool_key: ${tool.tool_key}`
            };
        }
      } catch (handlerError) {
        result = {
          success: false,
          error: handlerError instanceof Error ? handlerError.message : 'Handler execution failed'
        };
      }

      const executionTime = Date.now() - startTime;

      res.json({
        success: result.success,
        tool: {
          id: tool.id,
          tool_key: tool.tool_key,
          function_name: tool.function_name,
          name: tool.tool_name
        },
        parameterMapping: {
          original: testParams,
          mapped: mappedParams,
          mapping: tool.parameter_mapping
        },
        result: result,
        executionTime
      });

    } catch (error) {
      console.error('Tool test execution error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  return router;
}

// Export skill handler functions for use in other modules
export {
  executeWebSearchHandler,
  executeHttpRequestHandler,
  executeRagSearchHandler,
  executeTextSummarizeHandler,
  executeTimeNowHandler,
  executeRagPlaceHandler,
  executeRagContextsHandler,
  executeDataParseCSVHandler,
  executeDataParseJSONHandler,
  executeFsReadTextHandler,
  executeFsWriteTextHandler,
  executeWebBrowseHandler,
  executeWebCrawlHandler
};

// Skill handler implementations
async function executeRagPlaceHandler(params: any, tool: any) {
  const payload = {
    conversation_history: "",
    text_query: String(params.searchQuery || params.text_query || ''),
    simantic_query: "",
    intent_scope: "",
    intent_action: "",
    category: params.category || "",
    lat: typeof params.lat === 'number' ? params.lat : undefined,
    long: typeof params.long === 'number' ? params.long : undefined,
    max_distance_km: typeof params.maxDistanceKm === 'number' ? params.maxDistanceKm : 5,
    distance_weight: typeof params.distance_weight === 'number' ? params.distance_weight : 1,
    top_k: typeof params.maxResults === 'number' ? params.maxResults : 3,
    min_score: 0.5,
    fulltext_weight: typeof params.fulltext_weight === 'number' ? params.fulltext_weight : 0.5,
    semantic_weight: typeof params.semantic_weight === 'number' ? params.semantic_weight : 0.5,
    prompt_key: "",
    prompt_params: null,
  };

  // Get endpoint URL from tool configuration
  const baseUrl = process.env.APP_URL || 'http://localhost:3001';
  const endpointUrl = tool.overrides?.endpointUrl || '/api/rag/place';
  const url = endpointUrl.startsWith('http') 
    ? endpointUrl 
    : `${baseUrl}${endpointUrl.startsWith('/') ? '' : '/'}${endpointUrl}`;

  const headers: Record<string, string> = { 
    'Content-Type': 'application/json',
    ...(params.headers || {})
  };
  
  if (params.tenantId && !headers['x-tenant-id']) {
    headers['x-tenant-id'] = params.tenantId;
  }

  const response = await fetch(url, { 
    method: 'POST', 
    headers, 
    body: JSON.stringify(payload) 
  });
  
  const data = await response.json().catch(() => ({}));
  const results = data?.results || data?.places || data?.data || [];
  
  return { 
    success: true, 
    results, 
    totalResults: Array.isArray(results) ? results.length : 0,
    apiResponse: data
  };
}

async function executeRagSearchHandler(params: any, tool: any) {
  const payload = {
    text_query: String(params.searchQuery || params.text_query || ''),
    top_k: typeof params.maxResults === 'number' ? params.maxResults : 3,
    category: params.category || "",
    conversation_history: params.conversation_history || "",
    intent_scope: params.intent_scope || "",
    intent_action: params.intent_action || "",
    min_score: typeof params.min_score === 'number' ? params.min_score : 0.5
  };

  const baseUrl = process.env.APP_URL || 'http://localhost:3001';
  const endpointUrl = tool.overrides?.endpointUrl || '/api/rag/summary';
  const url = endpointUrl.startsWith('http') 
    ? endpointUrl 
    : `${baseUrl}${endpointUrl.startsWith('/') ? '' : '/'}${endpointUrl}`;

  const headers: Record<string, string> = { 
    'Content-Type': 'application/json',
    ...(params.headers || {})
  };
  
  if (params.tenantId && !headers['x-tenant-id']) {
    headers['x-tenant-id'] = params.tenantId;
  }

  const response = await fetch(url, { 
    method: 'POST', 
    headers, 
    body: JSON.stringify(payload) 
  });
  
  const data = await response.json().catch(() => ({}));
  
  return { 
    success: true, 
    answer: data.answer || '',
    answer_status: data.answer_status || false,
    answer_sources: data.answer_sources || [],
    context_sources: data.context_sources || [],
    apiResponse: data
  };
}

async function executeHttpRequestHandler(params: any, tool: any) {
  const url = params.url || params.endpoint || 'https://httpbin.org/get';
  const method = params.method || 'GET';
  const headers = params.headers || {};
  const body = params.body ? JSON.stringify(params.body) : undefined;

  const response = await fetch(url, { 
    method, 
    headers: { 'Content-Type': 'application/json', ...headers }, 
    body 
  });
  
  const data = await response.json().catch(() => ({}));
  
  return { 
    success: response.ok, 
    status: response.status,
    statusText: response.statusText,
    data,
    url,
    method
  };
}

async function executeTextSummarizeHandler(params: any, tool: any) {
  const text = params.text || params.content || '';
  const maxLength = typeof params.maxLength === 'number' ? params.maxLength : 100;
  
  // Simple text summarization (in real implementation, this would call an AI service)
  const words = text.split(' ');
  const summary = words.slice(0, maxLength).join(' ');
  
  return { 
    success: true, 
    originalText: text,
    summary,
    originalLength: text.length,
    summaryLength: summary.length,
    compressionRatio: summary.length / text.length
  };
}

async function executeTimeNowHandler(params: any, tool: any) {
  const format = params.format || 'iso';
  const now = new Date();
  
  let formattedTime;
  switch (format) {
    case 'iso':
      formattedTime = now.toISOString();
      break;
    case 'local':
      formattedTime = now.toLocaleString();
      break;
    case 'timestamp':
      formattedTime = now.getTime();
      break;
    default:
      formattedTime = now.toISOString();
  }
  
  return { 
    success: true, 
    time: formattedTime,
    format,
    timestamp: now.getTime(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

async function executeWebSearchHandler(params: any, tool: any) {
  const query = params.query || params.searchQuery || 'test search';
  const maxResults = params.maxResults || params.top_k || 5;
  const searchType = params.searchType || 'general';
  
  // Simulate web search results
  const results = [
    { title: `Search result 1 for "${query}"`, url: 'https://example1.com', snippet: 'This is a simulated search result.' },
    { title: `Search result 2 for "${query}"`, url: 'https://example2.com', snippet: 'Another simulated search result.' }
  ].slice(0, maxResults);
  
  return { 
    success: true, 
    searchQuery: query,
    searchType,
    results,
    totalResults: results.length
  };
}

async function executeRagContextsHandler(params: any, tool: any) {
  const query = params.query || params.text_query || 'test query';
  const topK = params.top_k || params.maxResults || 5;
  
  // Simulate RAG contexts search
  const contexts = [
    { id: 'ctx1', content: `Context 1 for "${query}"`, score: 0.95 },
    { id: 'ctx2', content: `Context 2 for "${query}"`, score: 0.87 }
  ].slice(0, topK);
  
  return { 
    success: true, 
    query,
    contexts,
    total: contexts.length,
    topK
  };
}

async function executeDataParseCSVHandler(params: any, tool: any) {
  const csvData = params.csvData || 'name,age\nJohn,30\nJane,25';
  const delimiter = params.delimiter || ',';
  const hasHeader = params.hasHeader !== false;
  
  // Simple CSV parsing simulation
  const lines = csvData.split('\n');
  const rows = lines.slice(hasHeader ? 1 : 0).map(line => {
    const values = line.split(delimiter);
    if (hasHeader) {
      const headers = lines[0].split(delimiter);
      const row: any = {};
      headers.forEach((header, i) => {
        row[header.trim()] = values[i]?.trim();
      });
      return row;
    }
    return values;
  });
  
  return { 
    success: true, 
    delimiter,
    hasHeader,
    rows,
    totalRows: rows.length
  };
}

async function executeDataParseJSONHandler(params: any, tool: any) {
  const jsonData = params.jsonData || '{"name": "John", "age": 30}';
  const strict = params.strict || false;
  
  try {
    const parsedData = JSON.parse(jsonData);
    return { 
      success: true, 
      strict,
      hasSchema: false,
      parsedData,
      isValid: true
    };
  } catch (error) {
    return { 
      success: false, 
      error: 'Invalid JSON format',
      parsedData: null,
      isValid: false
    };
  }
}

async function executeFsReadTextHandler(params: any, tool: any) {
  const filePath = params.filePath || '/tmp/test.txt';
  
  // Simulate file read (in real implementation, this would read actual files)
  if (filePath.includes('..') || !filePath.startsWith('/tmp/')) {
    return { 
      success: false, 
      error: 'Invalid file path: directory traversal not allowed'
    };
  }
  
  return { 
    success: true, 
    filePath,
    content: 'Simulated file content',
    size: 20,
    encoding: 'utf-8'
  };
}

async function executeFsWriteTextHandler(params: any, tool: any) {
  const filePath = params.filePath || '/tmp/test.txt';
  const content = params.content || 'test content';
  
  // Simulate file write (in real implementation, this would write actual files)
  if (filePath.includes('..') || !filePath.startsWith('/tmp/')) {
    return { 
      success: false, 
      error: 'Invalid file path: directory traversal not allowed'
    };
  }
  
  return { 
    success: true, 
    filePath,
    content,
    size: content.length,
    encoding: 'utf-8'
  };
}

async function executeWebBrowseHandler(params: any, tool: any) {
  const url = params.url || 'https://example.com';
  
  // Simulate web browsing
  return { 
    success: true, 
    url,
    title: `Web Page: ${new URL(url).hostname}`,
    content: 'General web page content simulation',
    status: 200,
    headers: { 'content-type': 'text/html' }
  };
}

async function executeWebCrawlHandler(params: any, tool: any) {
  const startUrl = params.startUrl || params.url || '';
  const maxPages = params.maxPages || 3;
  
  if (!startUrl) {
    return { 
      success: false, 
      error: 'Start URL is required and must be a string',
      crawledPages: [],
      totalCrawled: 0
    };
  }
  
  // Simulate web crawling
  const crawledPages = [
    { url: startUrl, title: 'Page 1', content: 'Content 1' },
    { url: `${startUrl}/page2`, title: 'Page 2', content: 'Content 2' }
  ].slice(0, maxPages);
  
  return { 
    success: true, 
    startUrl,
    crawledPages,
    totalCrawled: crawledPages.length,
    maxPages
  };
}
