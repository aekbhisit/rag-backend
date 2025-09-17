'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BACKEND_URL } from '../../../../../../components/config';

interface ToolRegistryEntry {
  tool_key: string;
  name: string;
  description: string;
  category: string;
  runtime: string;
  handler_key: string;
  input_schema: any;
  output_schema: any;
  default_settings: any;
  permissions: string[];
  version: string;
  is_enabled: boolean;
}

interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
  enum?: string[];
  default?: any;
}

interface ConfigField {
  name: string;
  type: string;
  description: string;
  required: boolean;
  enum?: string[];
  default?: any;
  placeholder?: string;
}

interface ToolTypeDefinition {
  name: string;
  description: string;
  category: string;
  runtime: string;
  parameters: ToolParameter[];
  configFields: ConfigField[];
  examples: {
    arg_defaults: Record<string, any>;
    arg_templates: Record<string, any>;
    guardrails: Record<string, any>;
    overrides: Record<string, any>;
  };
}

interface ExportedToolConfig {
  version: string;
  tool_key: string;
  tool_name: string;
  tool_description: string;
  alias: string;
  enabled: boolean;
  position: number;
  arg_defaults: Record<string, any>;
  arg_templates: Record<string, any>;
  guardrails: Record<string, any>;
  overrides: Record<string, any>;
  custom_ai_function?: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, any>;
      required: string[];
    };
  };
  exported_at: string;
  exported_by?: string;
}

const TOOL_TYPES: Record<string, ToolTypeDefinition> = {
  'skill.rag.search': {
    name: 'RAG Summary',
    description: 'Generate AI-powered summaries using RAG search with hybrid scoring',
    category: 'skill',
    runtime: 'server',
    parameters: [
      { name: 'text_query', type: 'string', description: 'What you want to know or search for', required: true },
      { name: 'category', type: 'string', description: 'Category to filter by (optional)', required: false },
      { name: 'conversation_history', type: 'string', description: 'Previous conversation context (optional)', required: false },
      { name: 'intent_scope', type: 'string', description: 'Intent scope for context (optional)', required: false },
      { name: 'intent_action', type: 'string', description: 'Intent action for context (optional)', required: false },
      { name: 'top_k', type: 'number', description: 'Number of results to return (optional)', required: false, default: 3 },
      { name: 'min_score', type: 'number', description: 'Minimum similarity score (optional)', required: false, default: 0.5 }
    ],
    configFields: [
      { name: 'api_endpoint', type: 'string', description: 'RAG API endpoint', required: true, default: '/api/rag/summary' },
      { name: 'method', type: 'string', description: 'HTTP method', required: true, default: 'POST' }
    ],
    examples: {
      arg_defaults: { top_k: 3, min_score: 0.5 },
      arg_templates: { text_query: '{{userInput}}', conversation_history: '{{context}}' },
      guardrails: { maxTopK: 20, minScoreRange: [0.1, 1.0] },
      overrides: {}
    }
  },
  'skill.rag.place': {
    name: 'RAG Place Search',
    description: 'Search for nearby places using location-based RAG with distance weighting',
    category: 'skill',
    runtime: 'server',
    parameters: [
      { name: 'text_query', type: 'string', description: 'What you are looking for (e.g., cafe, restaurant, hotel)', required: true },
      { name: 'lat', type: 'number', description: 'Current latitude coordinate', required: true },
      { name: 'long', type: 'number', description: 'Current longitude coordinate', required: true },
      { name: 'max_distance_km', type: 'number', description: 'Maximum search distance in kilometers (optional)', required: false, default: 5 },
      { name: 'category', type: 'string', description: 'Category to filter by (optional)', required: false },
      { name: 'conversation_history', type: 'string', description: 'Previous conversation context (optional)', required: false }
    ],
    configFields: [
      { name: 'api_endpoint', type: 'string', description: 'RAG API endpoint', required: true, default: '/api/rag/place' },
      { name: 'method', type: 'string', description: 'HTTP method', required: true, default: 'POST' }
    ],
    examples: {
      arg_defaults: { max_distance_km: 5 },
      arg_templates: { text_query: '{{userInput}}', lat: '{{userLat}}', long: '{{userLong}}' },
      guardrails: { maxDistance: 50, allowedCategories: ['restaurant', 'hotel', 'cafe'] },
      overrides: {}
    }
  },
  'skill.rag.contexts': {
    name: 'RAG Contexts',
    description: 'Retrieve raw contexts with optional summarization using RAG search',
    category: 'skill',
    runtime: 'server',
    parameters: [
      { name: 'text_query', type: 'string', description: 'What you want to search for', required: true },
      { name: 'category', type: 'string', description: 'Category to filter by (optional)', required: false },
      { name: 'conversation_history', type: 'string', description: 'Previous conversation context (optional)', required: false },
      { name: 'intent_scope', type: 'string', description: 'Intent scope for context (optional)', required: false },
      { name: 'intent_action', type: 'string', description: 'Intent action for context (optional)', required: false },
      { name: 'top_k', type: 'number', description: 'Number of results to return (optional)', required: false, default: 3 },
      { name: 'min_score', type: 'number', description: 'Minimum similarity score (optional)', required: false, default: 0.5 }
    ],
    configFields: [
      { name: 'api_endpoint', type: 'string', description: 'RAG API endpoint', required: true, default: '/api/rag/contexts' },
      { name: 'method', type: 'string', description: 'HTTP method', required: true, default: 'POST' }
    ],
    examples: {
      arg_defaults: { top_k: 3, min_score: 0.5 },
      arg_templates: { text_query: '{{userInput}}', conversation_history: '{{context}}' },
      guardrails: { maxTopK: 20, minScoreRange: [0.1, 1.0] },
      overrides: {}
    }
  },
  'skill.text.summarize': {
    name: 'Text Summarization',
    description: 'Summarize long text content',
    category: 'skill',
    runtime: 'server',
    parameters: [
      { name: 'text', type: 'string', description: 'Text to summarize', required: true },
      { name: 'maxLength', type: 'number', description: 'Maximum summary length', required: false, default: 150 },
      { name: 'style', type: 'enum', description: 'Summary style', required: false, enum: ['concise', 'detailed', 'bullet-points'] }
    ],
    configFields: [
      { name: 'model', type: 'string', description: 'Summarization model', required: false, default: 'gpt-3.5-turbo' },
      { name: 'temperature', type: 'number', description: 'Creativity level', required: false, default: 0.3 }
    ],
    examples: {
      arg_defaults: { maxLength: 150, style: 'concise' },
      arg_templates: { text: '{{context}}' },
      guardrails: { maxInputLength: 10000, allowedStyles: ['concise', 'detailed'] },
      overrides: { temperature: 0.2 }
    }
  },
  'skill.http.request': {
    name: 'HTTP Request',
    description: 'Make HTTP requests to external APIs with flexible parameter mapping',
    category: 'skill',
    runtime: 'server',
    parameters: [
      { name: 'method', type: 'enum', description: 'HTTP method', required: true, enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
      { name: 'path', type: 'string', description: 'Request path', required: true },
      { name: 'headers', type: 'object', description: 'Request headers', required: false },
      { name: 'body', type: 'object', description: 'Request body', required: false }
    ],
    configFields: [
      { name: 'base_url', type: 'string', description: 'Base URL for API calls', required: true, default: 'https://api.example.com' },
      { name: 'timeout', type: 'number', description: 'Request timeout in ms', required: false, default: 30000 },
      { name: 'max_retries', type: 'number', description: 'Maximum retry attempts', required: false, default: 3 }
    ],
    examples: {
      arg_defaults: { 
        method: 'GET',
        path: '/api/products',
        headers: { 'Authorization': 'Bearer $api_token' },
        body: { 'product_id': '$product_id' }
      },
      arg_templates: { 
        path: '{{userPath}}',
        headers: { 'X-User-ID': '{{userId}}' },
        body: { 'query': '{{userQuery}}' }
      },
      guardrails: { 
        allowedDomains: ['api.example.com'], 
        maxTimeout: 60000, 
        maxBodySize: 1000000 
      },
      overrides: { timeout: 30000 }
    }
  },

  'skill.web.browse': {
    name: 'Web Browse',
    description: 'Browse web pages and extract content',
    category: 'skill',
    runtime: 'server',
    parameters: [
      { name: 'url', type: 'string', description: 'URL to browse', required: true },
      { name: 'selector', type: 'string', description: 'CSS selector for content extraction', required: false },
      { name: 'waitFor', type: 'string', description: 'Element to wait for', required: false }
    ],
    configFields: [
      { name: 'allowedDomains', type: 'array', description: 'Allowed domains for browsing', required: false, default: ['example.com', 'docs.example.com'] },
      { name: 'timeout', type: 'number', description: 'Page load timeout in ms', required: false, default: 10000 },
      { name: 'userAgent', type: 'string', description: 'Custom user agent', required: false, default: 'AI-Agent/1.0' }
    ],
    examples: {
      arg_defaults: { timeout: 10000 },
      arg_templates: { url: '{{userUrl}}' },
      guardrails: { allowedDomains: ['example.com'], maxTimeout: 30000, maxContentSize: 1000000 },
      overrides: { userAgent: 'AI-Agent/1.0' }
    }
  },
  'skill.web.crawl': {
    name: 'Web Crawl',
    description: 'Crawl multiple web pages systematically',
    category: 'skill',
    runtime: 'server',
    parameters: [
      { name: 'startUrl', type: 'string', description: 'Starting URL for crawling', required: true },
      { name: 'maxPages', type: 'number', description: 'Maximum pages to crawl', required: false, default: 10 },
      { name: 'selectors', type: 'array', description: 'CSS selectors for content extraction', required: false }
    ],
    configFields: [
      { name: 'allowedDomains', type: 'array', description: 'Allowed domains for crawling', required: false, default: ['example.com'] },
      { name: 'crawlDelay', type: 'number', description: 'Delay between requests in ms', required: false, default: 1000 },
      { name: 'maxDepth', type: 'number', description: 'Maximum crawl depth', required: false, default: 3 }
    ],
    examples: {
      arg_defaults: { maxPages: 10, crawlDelay: 1000 },
      arg_templates: { startUrl: '{{userUrl}}' },
      guardrails: { allowedDomains: ['example.com'], maxPages: 50, maxDepth: 5 },
      overrides: { crawlDelay: 2000 }
    }
  },
  'skill.fs.readText': {
    name: 'Read Text File',
    description: 'Read text content from files',
    category: 'skill',
    runtime: 'server',
    parameters: [
      { name: 'filePath', type: 'string', description: 'Path to file to read', required: true },
      { name: 'encoding', type: 'string', description: 'File encoding', required: false, default: 'utf-8' },
      { name: 'maxSize', type: 'number', description: 'Maximum file size in bytes', required: false, default: 1048576 }
    ],
    configFields: [
      { name: 'allowedPaths', type: 'array', description: 'Allowed file paths', required: false, default: ['/data/', '/uploads/'] },
      { name: 'maxFileSize', type: 'number', description: 'Maximum file size in bytes', required: false, default: 1048576 },
      { name: 'allowedExtensions', type: 'array', description: 'Allowed file extensions', required: false, default: ['.txt', '.md', '.json'] }
    ],
    examples: {
      arg_defaults: { encoding: 'utf-8', maxSize: 1048576 },
      arg_templates: { filePath: '{{userFilePath}}' },
      guardrails: { allowedPaths: ['/data/'], maxFileSize: 1048576, allowedExtensions: ['.txt', '.md'] },
      overrides: { encoding: 'utf-8' }
    }
  },
  'skill.fs.writeText': {
    name: 'Write Text File',
    description: 'Write text content to files',
    category: 'skill',
    runtime: 'server',
    parameters: [
      { name: 'filePath', type: 'string', description: 'Path to file to write', required: true },
      { name: 'content', type: 'string', description: 'Content to write', required: true },
      { name: 'encoding', type: 'string', description: 'File encoding', required: false, default: 'utf-8' },
      { name: 'append', type: 'boolean', description: 'Append to existing file', required: false, default: false }
    ],
    configFields: [
      { name: 'allowedPaths', type: 'array', description: 'Allowed file paths', required: false, default: ['/data/', '/uploads/'] },
      { name: 'maxContentSize', type: 'number', description: 'Maximum content size in bytes', required: false, default: 1048576 },
      { name: 'allowedExtensions', type: 'array', description: 'Allowed file extensions', required: false, default: ['.txt', '.md', '.json'] }
    ],
    examples: {
      arg_defaults: { encoding: 'utf-8', append: false },
      arg_templates: { filePath: '{{userFilePath}}' },
      guardrails: { allowedPaths: ['/data/'], maxContentSize: 1048576, allowedExtensions: ['.txt', '.md'] },
      overrides: { encoding: 'utf-8' }
    }
  },
  'skill.data.parseCSV': {
    name: 'Parse CSV',
    description: 'Parse CSV data and convert to structured format',
    category: 'skill',
    runtime: 'server',
    parameters: [
      { name: 'csvData', type: 'string', description: 'CSV data to parse', required: true },
      { name: 'delimiter', type: 'string', description: 'CSV delimiter', required: false, default: ',' },
      { name: 'hasHeader', type: 'boolean', description: 'Whether CSV has header row', required: false, default: true }
    ],
    configFields: [
      { name: 'maxRows', type: 'number', description: 'Maximum rows to parse', required: false, default: 1000 },
      { name: 'allowedDelimiters', type: 'array', description: 'Allowed delimiters', required: false, default: [',', ';', '\t'] },
      { name: 'maxColumnWidth', type: 'number', description: 'Maximum column width', required: false, default: 1000 }
    ],
    examples: {
      arg_defaults: { delimiter: ',', hasHeader: true },
      arg_templates: { csvData: '{{userCSV}}' },
      guardrails: { maxRows: 1000, allowedDelimiters: [',', ';'], maxColumnWidth: 1000 },
      overrides: { delimiter: ',' }
    }
  },
  'skill.data.parseJSON': {
    name: 'Parse JSON',
    description: 'Parse JSON data and validate structure',
    category: 'skill',
    runtime: 'server',
    parameters: [
      { name: 'jsonData', type: 'string', description: 'JSON data to parse', required: true },
      { name: 'schema', type: 'object', description: 'JSON schema for validation', required: false },
      { name: 'strict', type: 'boolean', description: 'Strict parsing mode', required: false, default: false }
    ],
    configFields: [
      { name: 'maxDepth', type: 'number', description: 'Maximum JSON depth', required: false, default: 10 },
      { name: 'maxArraySize', type: 'number', description: 'Maximum array size', required: false, default: 1000 },
      { name: 'allowedTypes', type: 'array', description: 'Allowed JSON value types', required: false, default: ['string', 'number', 'boolean', 'object', 'array'] }
    ],
    examples: {
      arg_defaults: { strict: false },
      arg_templates: { jsonData: '{{userJSON}}' },
      guardrails: { maxDepth: 10, maxArraySize: 1000, allowedTypes: ['string', 'number', 'boolean'] },
      overrides: { strict: false }
    }
  },
  'core.intentionChange': {
    name: 'Intention Change',
    description: 'Change the current conversation intention',
    category: 'core',
    runtime: 'server',
    parameters: [
      { name: 'newIntention', type: 'string', description: 'New intention to set', required: true },
      { name: 'context', type: 'string', description: 'Context for the change', required: false }
    ],
    configFields: [
      { name: 'allowedIntentions', type: 'array', description: 'Allowed intention values', required: false, default: ['travel', 'booking', 'information'] }
    ],
    examples: {
      arg_defaults: { context: 'User requested change' },
      arg_templates: { newIntention: '{{userRequestedIntention}}' },
      guardrails: { maxIntentionLength: 100, allowedIntentions: ['travel', 'booking', 'information'] },
      overrides: { context: 'AI detected change' }
    }
  },
  'core.transferAgents': {
    name: 'Transfer Agents',
    description: 'Transfer conversation to another agent',
    category: 'core',
    runtime: 'server',
    parameters: [
      { name: 'targetAgent', type: 'string', description: 'Target agent key', required: true },
      { name: 'reason', type: 'string', description: 'Transfer reason', required: false },
      { name: 'context', type: 'object', description: 'Context to pass', required: false }
    ],
    configFields: [
      { name: 'allowedAgents', type: 'array', description: 'Allowed target agents', required: false, default: ['support', 'sales', 'technical'] }
    ],
    examples: {
      arg_defaults: { reason: 'Better suited agent' },
      arg_templates: { targetAgent: '{{userRequestedAgent}}' },
      guardrails: { allowedAgents: ['support', 'sales', 'technical'], maxContextSize: 1000 },
      overrides: { reason: 'AI detected need' }
    }
  },
  'core.transferBack': {
    name: 'Transfer Back',
    description: 'Transfer conversation back to previous agent',
    category: 'core',
    runtime: 'server',
    parameters: [
      { name: 'reason', type: 'string', description: 'Transfer reason', required: false },
      { name: 'summary', type: 'string', description: 'Summary of current state', required: false }
    ],
    configFields: [
      { name: 'autoTransfer', type: 'boolean', description: 'Auto-transfer on completion', required: false, default: false }
    ],
    examples: {
      arg_defaults: { reason: 'Task completed' },
      arg_templates: { summary: '{{currentState}}' },
      guardrails: { maxSummaryLength: 500, requireReason: true },
      overrides: { reason: 'AI detected completion' }
    }
  },
  'core.variables': {
    name: 'Variables',
    description: 'Manage conversation variables and state',
    category: 'core',
    runtime: 'server',
    parameters: [
      { name: 'action', type: 'enum', description: 'Variable action', required: true, enum: ['get', 'set', 'delete', 'list'] },
      { name: 'key', type: 'string', description: 'Variable key', required: false },
      { name: 'value', type: 'any', description: 'Variable value', required: false }
    ],
    configFields: [
      { name: 'maxVariables', type: 'number', description: 'Maximum variables allowed', required: false, default: 100 },
      { name: 'persistent', type: 'boolean', description: 'Persist variables across sessions', required: false, default: false }
    ],
    examples: {
      arg_defaults: { action: 'get' },
      arg_templates: { key: '{{userVariable}}' },
      guardrails: { maxVariables: 100, maxKeyLength: 50, maxValueSize: 10000 },
      overrides: { persistent: true }
    }
  },
  'ui.navigate': {
    name: 'Navigate',
    description: 'Navigate to different UI sections',
    category: 'ui',
    runtime: 'client',
    parameters: [
      { name: 'section', type: 'string', description: 'Section to navigate to', required: true },
      { name: 'params', type: 'object', description: 'Navigation parameters', required: false }
    ],
    configFields: [
      { name: 'allowedSections', type: 'array', description: 'Allowed navigation sections', required: false, default: ['home', 'search', 'profile'] }
    ],
    examples: {
      arg_defaults: { params: {} },
      arg_templates: { section: '{{userRequestedSection}}' },
      guardrails: { allowedSections: ['home', 'search', 'profile'], maxParams: 10 },
      overrides: { params: { source: 'ai' } }
    }
  },
  'ui.extractContent': {
    name: 'Extract Content',
    description: 'Extract specific content from UI elements',
    category: 'ui',
    runtime: 'client',
    parameters: [
      { name: 'selector', type: 'string', description: 'CSS selector for element', required: true },
      { name: 'attribute', type: 'string', description: 'Attribute to extract', required: false, default: 'text' },
      { name: 'multiple', type: 'boolean', description: 'Extract multiple elements', required: false, default: false }
    ],
    configFields: [
      { name: 'allowedSelectors', type: 'array', description: 'Allowed CSS selectors', required: false, default: ['.content', '.text', '.title'] },
      { name: 'maxElements', type: 'number', description: 'Maximum elements to extract', required: false, default: 10 }
    ],
    examples: {
      arg_defaults: { attribute: 'text', multiple: false },
      arg_templates: { selector: '{{userSelector}}' },
      guardrails: { allowedSelectors: ['.content', '.text', '.title'], maxElements: 10 },
      overrides: { attribute: 'text' }
    }
  },
  'ui.selectItem': {
    name: 'Select Item',
    description: 'Select an item from a list or dropdown',
    category: 'ui',
    runtime: 'client',
    parameters: [
      { name: 'selector', type: 'string', description: 'CSS selector for list', required: true },
      { name: 'index', type: 'number', description: 'Item index to select', required: false, default: 0 },
      { name: 'value', type: 'string', description: 'Value to select', required: false }
    ],
    configFields: [
      { name: 'allowedSelectors', type: 'array', description: 'Allowed CSS selectors', required: false, default: ['select', '.dropdown', '.list'] },
      { name: 'defaultIndex', type: 'number', description: 'Default selection index', required: false, default: 0 }
    ],
    examples: {
      arg_defaults: { index: 0 },
      arg_templates: { selector: '{{userSelector}}' },
      guardrails: { allowedSelectors: ['select', '.dropdown', '.list'], maxIndex: 100 },
      overrides: { index: 0 }
    }
  },
  'ui.switchView': {
    name: 'Switch View',
    description: 'Switch between different UI views or modes',
    category: 'ui',
    runtime: 'client',
    parameters: [
      { name: 'view', type: 'string', description: 'View to switch to', required: true },
      { name: 'params', type: 'object', description: 'View parameters', required: false }
    ],
    configFields: [
      { name: 'allowedViews', type: 'array', description: 'Allowed view names', required: false, default: ['list', 'grid', 'detail', 'edit'] },
      { name: 'defaultView', type: 'string', description: 'Default view', required: false, default: 'list' }
    ],
    examples: {
      arg_defaults: { params: {} },
      arg_templates: { view: '{{userRequestedView}}' },
      guardrails: { allowedViews: ['list', 'grid', 'detail', 'edit'], maxParams: 5 },
      overrides: { view: 'list' }
    }
  },
  'ui.filterContent': {
    name: 'Filter Content',
    description: 'Filter content based on criteria',
    category: 'ui',
    runtime: 'client',
    parameters: [
      { name: 'criteria', type: 'object', description: 'Filter criteria', required: true },
      { name: 'operator', type: 'enum', description: 'Filter operator', required: false, enum: ['and', 'or'], default: 'and' }
    ],
    configFields: [
      { name: 'allowedFields', type: 'array', description: 'Allowed filter fields', required: false, default: ['name', 'category', 'status'] },
      { name: 'maxCriteria', type: 'number', description: 'Maximum filter criteria', required: false, default: 5 }
    ],
    examples: {
      arg_defaults: { operator: 'and' },
      arg_templates: { criteria: '{{userFilters}}' },
      guardrails: { allowedFields: ['name', 'category', 'status'], maxCriteria: 5 },
      overrides: { operator: 'and' }
    }
  },
  'ui.toast': {
    name: 'Toast Notification',
    description: 'Show toast notification to user',
    category: 'ui',
    runtime: 'client',
    parameters: [
      { name: 'message', type: 'string', description: 'Notification message', required: true },
      { name: 'type', type: 'enum', description: 'Notification type', required: false, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
      { name: 'duration', type: 'number', description: 'Display duration in ms', required: false, default: 3000 }
    ],
    configFields: [
      { name: 'allowedTypes', type: 'array', description: 'Allowed notification types', required: false, default: ['info', 'success', 'warning', 'error'] },
      { name: 'maxDuration', type: 'number', description: 'Maximum duration', required: false, default: 10000 }
    ],
    examples: {
      arg_defaults: { type: 'info', duration: 3000 },
      arg_templates: { message: '{{userMessage}}' },
      guardrails: { allowedTypes: ['info', 'success', 'warning', 'error'], maxDuration: 10000 },
      overrides: { type: 'info' }
    }
  },

  'travel.tour.searchPackages': {
    name: 'Search Tour Packages',
    description: 'Search for available tour packages',
    category: 'travel',
    runtime: 'server',
    parameters: [
      { name: 'destination', type: 'string', description: 'Travel destination', required: true },
      { name: 'dates', type: 'object', description: 'Travel dates', required: false },
      { name: 'budget', type: 'number', description: 'Budget range', required: false },
      { name: 'travelers', type: 'number', description: 'Number of travelers', required: false, default: 1 }
    ],
    configFields: [
      { name: 'apiEndpoint', type: 'string', description: 'Tour API endpoint', required: true, placeholder: 'https://api.tours.com/search' },
      { name: 'defaultCurrency', type: 'string', description: 'Default currency', required: false, default: 'USD' }
    ],
    examples: {
      arg_defaults: { travelers: 1, budget: 1000 },
      arg_templates: { destination: '{{userDestination}}', dates: '{{userDates}}' },
      guardrails: { maxBudget: 10000, maxTravelers: 10, allowedDestinations: ['Thailand', 'Japan', 'Europe'] },
      overrides: { currency: 'USD' }
    }
  }
};

export default function AddAgentToolPage() {
  const params = useParams();
  const router = useRouter();
  const agentKey = decodeURIComponent(String(params?.agentKey || ''));
  const apiBase = useMemo(() => `${BACKEND_URL}/api/admin`, []);
  
  const [catalog, setCatalog] = useState<ToolRegistryEntry[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [toolConfig, setToolConfig] = useState({
    alias: '',
    enabled: true,
    position: 0,
    arg_defaults: {} as Record<string, any>,
    arg_templates: {} as Record<string, any>,
    guardrails: {} as Record<string, any>,
    overrides: {} as Record<string, any>
  });

  // AI Function Configuration
  const [showAIFunction, setShowAIFunction] = useState(true);
  const [selectedAIFunction, setSelectedAIFunction] = useState<string>('');
  const [customAIFunction, setCustomAIFunction] = useState({
    name: '',
    description: '',
    parameters: {
      type: 'object',
      properties: {} as Record<string, {
        type: string | string[];
        description: string;
        enum?: string[];
        items?: {
          type: string;
          enum?: string[];
        };
        properties?: Record<string, any>;
      }>,
      required: [] as string[],
      additionalProperties: false
    }
  });

  // State to track parameter mappings
  const [parameterMappings, setParameterMappings] = useState<Record<string, string>>({});

  // State for tool testing
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const selectedToolDef = selectedTool ? TOOL_TYPES[selectedTool] : null;

  // Function to generate request body mapping based on parameter mappings
  const generateRequestBodyMapping = () => {
    if (!selectedTool || !selectedTool.startsWith('skill.rag.')) {
      return toolConfig.arg_defaults.request_body || '';
    }

    // Get the base template for the selected tool
    let baseTemplate = '';
    if (selectedTool === 'skill.rag.place') {
      baseTemplate = `{
  "text_query": "$text_query_str",
  "lat": $lat_num,
  "long": $long_num,
  "max_distance_km": 5,
  "distance_weight": 1,
  "top_k": 3,
  "min_score": 0.5,
  "fulltext_weight": 0.5,
  "semantic_weight": 0.5,
  "intent_scope": "",
  "intent_action": "",
  "simantic_query": "",
  "prompt_key": "",
  "prompt_params": null
}`;
    } else if (selectedTool === 'skill.rag.search') {
      baseTemplate = `{
  "text_query": "$text_query_str",
  "category": "$category_str",
  "top_k": 3,
  "min_score": 0.5,
  "fulltext_weight": 0.5,
  "semantic_weight": 0.5,
  "intent_scope": "",
  "intent_action": "",
  "simantic_query": "",
  "prompt_key": "",
  "prompt_params": null
}`;
    } else {
      baseTemplate = `{
  "text_query": "$text_query_str",
  "category": "$category_str",
  "top_k": 3,
  "min_score": 0.5,
  "fulltext_weight": 0.5,
  "semantic_weight": 0.5,
  "intent_scope": "",
  "intent_action": "",
  "simantic_query": ""
}`;
    }

    // Update the template based on parameter mappings
    let updatedTemplate = baseTemplate;
    Object.entries(parameterMappings).forEach(([paramName, mapping]) => {
      if (mapping && mapping !== 'static' && mapping !== 'config') {
        // Replace the mapping in the template
        const paramType = customAIFunction.parameters.properties[paramName]?.type;
        const isString = Array.isArray(paramType) ? paramType[0] === 'string' : paramType === 'string';
        const value = isString ? `"$${paramName}"` : `$${paramName}`;
        
        // Replace the mapping in the template
        updatedTemplate = updatedTemplate.replace(
          new RegExp(`"${mapping}": "[^"]*"`, 'g'),
          `"${mapping}": ${value}`
        );
        updatedTemplate = updatedTemplate.replace(
          new RegExp(`"${mapping}": [^,}\\s]+`, 'g'),
          `"${mapping}": ${value}`
        );
      }
    });

    return updatedTemplate;
  };

  // Function to validate test parameters
  const isTestParamsValid = () => {
    const requiredParams = customAIFunction.parameters.required;
    return requiredParams.every(param => testParams[param] && testParams[param].trim() !== '');
  };

  // Function to clear test results
  const clearTestResults = () => {
    setTestResults(null);
    setTestParams({});
  };

  // Function to test tool execution using skill handler
  const testToolExecution = async () => {
    if (!selectedTool || !isTestParamsValid()) return;

    setTesting(true);
    setTestResults(null);

    try {
      // Create a temporary tool configuration for testing
      const tempToolConfig = {
        id: `temp-${Date.now()}`,
        tool_key: selectedTool,
        function_name: customAIFunction.name || selectedToolDef?.name || 'testFunction',
        parameter_mapping: parameterMappings,
        arg_defaults: toolConfig.arg_defaults,
        overrides: toolConfig.overrides
      };

      // Use skill handler endpoint instead of direct API calls
      const response = await fetch(`${apiBase}/tool-test/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'test-user'
        },
        body: JSON.stringify({
          toolId: tempToolConfig.id,
          testParams: testParams,
          toolConfig: tempToolConfig
        })
      });

      const responseData = await response.json();

      setTestResults({
        method: 'POST',
        url: `${apiBase}/tool-test/execute`,
        headers: { 'Content-Type': 'application/json' },
        body: {
          toolId: tempToolConfig.id,
          testParams: testParams,
          toolConfig: tempToolConfig
        },
        response: {
          status: response.status,
          data: responseData
        }
      });
    } catch (error) {
      setTestResults({
        method: 'POST',
        url: 'Error occurred',
        headers: {},
        body: null,
        response: {
          status: 'Error',
          data: { error: error instanceof Error ? error.message : 'Unknown error' }
        }
      });
    } finally {
      setTesting(false);
    }
  };

  // Function to generate test API call
  const generateTestApiCall = (): {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: any;
  } => {
    if (!selectedTool) return { method: 'POST', url: '', headers: {}, body: null };

    // Get the base URL from tool config
    const baseUrl = toolConfig.arg_defaults?.api_endpoint || '/api/rag/summary';
    const method = toolConfig.arg_defaults?.method || 'POST';

    // Generate request body by mapping test parameters
    let requestBody: any = {};
    
    if (selectedTool.startsWith('skill.rag.')) {
      // Parse the request body mapping
      const bodyMapping = toolConfig.arg_defaults?.request_body;
      if (bodyMapping) {
        try {
          requestBody = JSON.parse(bodyMapping);
          
          // Replace parameter placeholders with test values
          Object.entries(testParams).forEach(([paramName, paramValue]) => {
            const mapping = parameterMappings[paramName];
            if (mapping && mapping !== 'static' && mapping !== 'config') {
              // Replace $paramName with actual value
              const paramType = customAIFunction.parameters.properties[paramName]?.type;
              const isString = Array.isArray(paramType) ? paramType[0] === 'string' : paramType === 'string';
              const value = isString ? paramValue : (paramType === 'number' ? Number(paramValue) : paramValue);
              
              // Replace in request body
              requestBody = JSON.parse(JSON.stringify(requestBody).replace(
                new RegExp(`\\$${paramName}`, 'g'),
                JSON.stringify(value)
              ));
            }
          });
        } catch (error) {
          console.error('Error parsing request body mapping:', error);
        }
      }
    }

    return {
      method,
      url: `http://localhost:3001${baseUrl}`,
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': 'test-user'
      },
      body: requestBody
    };
  };

  async function loadCatalog() {
    setLoading(true); 
    setError('');
    try {
      const res = await fetch(`${apiBase}/tool-registry`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load tool catalog');
      const data = await res.json();
      
      // Only show skill tools in the catalog - core and ui tools are automatically available
      // Also exclude time and geo tools as they are not needed
      const skillTools = data.filter((tool: any) => {
        if (tool.category !== 'skill') return false;
        
        // Skip time and geo tools
        if (tool.tool_key.startsWith('skill.time.') || tool.tool_key.startsWith('skill.geo.')) {
          return false;
        }
        
        return true;
      });
      setCatalog(skillTools);
    } catch (e: any) { 
      setError(e?.message || 'Load failed'); 
    } finally { 
      setLoading(false); 
    }
  }

  useEffect(() => { 
    loadCatalog(); 
  }, []);

  function handleToolSelect(toolKey: string) {
    setSelectedTool(toolKey);
    const toolDef = TOOL_TYPES[toolKey];
    if (toolDef) {
      setToolConfig(prev => ({
        ...prev,
        arg_defaults: toolDef.examples.arg_defaults,
        arg_templates: toolDef.examples.arg_templates,
        guardrails: toolDef.examples.guardrails,
        overrides: toolDef.examples.overrides
      }));
    }
  }

  async function saveTool() {
    if (!selectedTool) return;
    
    try {
      const toolData = {
        agent_key: agentKey,
        tool_key: selectedTool,
        alias: toolConfig.alias,
        enabled: toolConfig.enabled,
        position: toolConfig.position,
        arg_defaults: toolConfig.arg_defaults,
        arg_templates: toolConfig.arg_templates,
        guardrails: toolConfig.guardrails,
        overrides: toolConfig.overrides
      };

      const res = await fetch(`${apiBase}/agents/${encodeURIComponent(agentKey)}/tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toolData)
      });

      if (!res.ok) throw new Error('Failed to save tool');
      
      router.push(`/admin/agents/${encodeURIComponent(agentKey)}/tools`);
    } catch (e: any) {
      setError(e?.message || 'Save failed');
    }
  }

  // Export tool configuration to JSON file
  function exportToolConfig() {
    if (!selectedTool || !selectedToolDef) return;

    const exportData: ExportedToolConfig = {
      version: '1.0',
      tool_key: selectedTool,
      tool_name: selectedToolDef.name,
      tool_description: selectedToolDef.description,
      alias: toolConfig.alias,
      enabled: toolConfig.enabled,
      position: toolConfig.position,
      arg_defaults: toolConfig.arg_defaults,
      arg_templates: toolConfig.arg_templates,
      guardrails: toolConfig.guardrails,
      overrides: toolConfig.overrides,
      custom_ai_function: showAIFunction ? {
        name: customAIFunction.name,
        description: customAIFunction.description,
        parameters: customAIFunction.parameters
      } : undefined,
      exported_at: new Date().toISOString(),
      exported_by: 'RAG Admin'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTool.replace(/\./g, '_')}_config_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Import tool configuration from JSON file
  function importToolConfig(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData: ExportedToolConfig = JSON.parse(e.target?.result as string);
        
        // Validate the imported data
        if (!importData.tool_key || !importData.version) {
          setError('Invalid tool configuration file format');
          return;
        }

        // Check if the tool exists in our catalog
        if (!TOOL_TYPES[importData.tool_key]) {
          setError(`Tool '${importData.tool_key}' is not available in the current catalog`);
          return;
        }

        // Initialize the form with imported data
        setSelectedTool(importData.tool_key);
        
        // Set tool configuration
        setToolConfig({
          alias: importData.alias || '',
          enabled: importData.enabled !== undefined ? importData.enabled : true,
          position: importData.position || 0,
          arg_defaults: importData.arg_defaults || {},
          arg_templates: importData.arg_templates || {},
          guardrails: importData.guardrails || {},
          overrides: importData.overrides || {}
        });

        // Set AI function configuration if present
        if (importData.custom_ai_function) {
          setShowAIFunction(true);
          setCustomAIFunction({
            name: importData.custom_ai_function.name || '',
            description: importData.custom_ai_function.description || '',
            parameters: {
              type: importData.custom_ai_function.parameters?.type || 'object',
              properties: importData.custom_ai_function.parameters?.properties || {},
              required: importData.custom_ai_function.parameters?.required || [],
              additionalProperties: false
            }
          });
        } else {
          setShowAIFunction(false);
          setCustomAIFunction({
            name: '',
            description: '',
            parameters: {
              type: 'object',
              properties: {},
              required: [],
              additionalProperties: false
            }
          });
        }

        setError('');
      } catch (error) {
        setError('Failed to parse tool configuration file');
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    event.target.value = '';
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      <nav className="text-sm text-gray-600">
        <a href="/admin" className="underline">Admin</a>
        <span className="mx-2">/</span>
        <a href="/admin/agents" className="underline">Agents</a>
        <span className="mx-2">/</span>
        <a href={`/admin/agents/${encodeURIComponent(agentKey)}/edit`} className="underline">{agentKey}</a>
        <span className="mx-2">/</span>
        <a href={`/admin/agents/${encodeURIComponent(agentKey)}/tools`} className="underline">Tools</a>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Add Skill Tool</span>
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Add Skill Tool to Agent: {agentKey}</h1>
          <p className="text-sm text-gray-600 mt-2">Core & UI tools are automatically available to all agents</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Import/Export Buttons */}
          <div className="flex items-center gap-2 mr-4">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json"
                onChange={importToolConfig}
                className="hidden"
              />
              <div className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                📥 Import Config
              </div>
            </label>
            {selectedTool && (
              <button
                onClick={exportToolConfig}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                📤 Export Config
              </button>
            )}
          </div>
          <button 
            onClick={() => router.push(`/admin/agents/${encodeURIComponent(agentKey)}/tools`)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Back to Tools
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}
      
      {/* Import/Export Info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-medium text-yellow-900 mb-2">📁 Import & Export Tool Configurations</h3>
        <div className="text-sm text-yellow-800 space-y-2">
          <p><strong>Export:</strong> Save your current tool configuration to a JSON file for backup or sharing.</p>
          <p><strong>Import:</strong> Load a previously exported tool configuration to quickly set up tools.</p>
          <p className="text-xs text-yellow-700 mt-2">
            💡 <strong>Tip:</strong> Export configurations after setting up complex tools to save time on future setups!
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tool Catalog */}
        <div className="lg:col-span-4 bg-white border rounded-lg p-4">
          <h2 className="text-lg font-medium mb-4">Skill Tool Catalog</h2>
          
          {/* Auto-available tools info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <h3 className="font-medium text-blue-900 mb-2">🔄 Automatically Available Tools</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Core Tools:</strong> intentionChange, transferAgents, transferBack, variables, time.now</p>
              <p><strong>UI Tools:</strong> navigate, extractContent, selectItem, switchView, filterContent, toast</p>
              <p className="text-xs text-blue-600 mt-2">These essential tools are automatically available to all agents and cannot be removed.</p>
            </div>
          </div>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading tools...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                // Group tools by subcategory
                const groupedCatalog = catalog.reduce((groups: any, tool) => {
                  const toolKey = tool.tool_key;
                  let subcategory = 'other';
                  
                  // Extract subcategory from tool key
                  if (toolKey.startsWith('skill.')) {
                    const parts = toolKey.split('.');
                    if (parts.length >= 3) {
                      subcategory = parts[1]; // skill.http.request -> http, skill.rag.place -> rag
                    }
                  } else if (toolKey.startsWith('travel.')) {
                    subcategory = 'travel';
                  }
                  
                  // Skip core and ui tools from catalog display
                  if (toolKey.startsWith('core.') || toolKey.startsWith('ui.')) {
                    return groups;
                  }
                  
                  if (!groups[subcategory]) {
                    groups[subcategory] = [];
                  }
                  groups[subcategory].push(tool);
                  return groups;
                }, {});

                return Object.entries(groupedCatalog).map(([category, categoryTools]: [string, any]) => (
                  <div key={category} className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide border-b pb-1">
                      {(() => {
                        switch (category) {
                          case 'http': return 'HTTP Tools';
                          case 'data': return 'Data Tools';
                          case 'rag': return 'RAG Tools';
                          case 'text': return 'Text Tools';
                          case 'fs': return 'File System Tools';
                          case 'web': return 'Web Tools';
                          case 'travel': return 'Travel Tools';
                          default: return `${category.charAt(0).toUpperCase() + category.slice(1)} Tools`;
                        }
                      })()}
                    </h3>
                    <div className="space-y-2">
                      {categoryTools.map((tool: any) => (
                        <div 
                          key={tool.tool_key}
                          onClick={() => handleToolSelect(tool.tool_key)}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            selectedTool === tool.tool_key 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{tool.name}</div>
                              <div className="text-sm text-gray-600">{tool.description || 'No description'}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {tool.runtime}
                              </div>
                            </div>
                            <div className="text-xs text-gray-400 font-mono">{tool.tool_key}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        {/* Right Column: Tool Configuration */}
        <div className="lg:col-span-8 bg-white border rounded-lg p-4">
          <h2 className="text-lg font-medium mb-4">Tool Configuration</h2>
          
          {!selectedTool ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-2">🔧</div>
              <p>Select a tool from the catalog to configure it</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tool Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">{selectedToolDef?.name}</h3>
                <p className="text-sm text-blue-800">{selectedToolDef?.description}</p>
                <div className="text-xs text-blue-700 mt-2">
                  Category: {selectedToolDef?.category} • Runtime: {selectedToolDef?.runtime}
                </div>
              </div>

              {/* How It All Works */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">🔄 How This Works</h4>
                <div className="text-sm text-green-800 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-medium">1.</span>
                    <div>
                      <strong>AI Function</strong>: You define a simple function (e.g., <code>change_intention</code>) 
                      with basic parameters (e.g., <code>intention</code>)
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-medium">2.</span>
                    <div>
                      <strong>Parameter Mapping</strong>: AI parameters map to tool parameters 
                      (e.g., <code>intention</code> → <code>newIntention</code>)
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-medium">3.</span>
                    <div>
                      <strong>Tool Execution</strong>: Tool runs with mapped values + defaults + settings
                    </div>
                  </div>
                </div>
              </div>

              {/* RAG Tools Special Info */}
              {selectedTool && selectedTool.startsWith('skill.rag.') && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-medium text-purple-900 mb-2">🔍 RAG Tools - Smart Parameter Mapping</h4>
                  <div className="text-sm text-purple-800 space-y-3">
                    <div>
                      <strong>🎯 What You See vs. What Gets Sent:</strong>
                      <div className="mt-2 space-y-2">
                        <div className="bg-white border rounded p-2">
                          <div className="text-xs text-purple-600 font-medium mb-1">AI Function Parameters (Simple):</div>
                          <div className="text-xs font-mono bg-gray-100 p-1 rounded">
                            {selectedTool === 'skill.rag.place' ? (
                              <>
                                text_query: "cafe nearby"<br/>
                                lat: 13.7563<br/>
                                long: 100.5018
                              </>
                            ) : selectedTool === 'skill.rag.search' ? (
                              <>
                                text_query: "safety procedures"<br/>
                                category: "safety"
                              </>
                            ) : (
                              <>
                                text_query: "travel information"<br/>
                                top_k: 5
                              </>
                            )}
                          </div>
                        </div>
                        <div className="bg-white border rounded p-2">
                          <div className="text-xs text-purple-600 font-medium mb-1">Actual API Call (Complete):</div>
                          <div className="text-xs font-mono bg-gray-100 p-1 rounded">
                            {selectedTool === 'skill.rag.place' ? (
                              <>
                                text_query: "cafe nearby"<br/>
                                lat: 13.7563, long: 100.5018<br/>
                                max_distance_km: 5, distance_weight: 1<br/>
                                top_k: 3, min_score: 0.5<br/>
                                fulltext_weight: 0.5, semantic_weight: 0.5<br/>
                                + 5 more default parameters
                              </>
                            ) : selectedTool === 'skill.rag.search' ? (
                              <>
                                text_query: "safety procedures"<br/>
                                category: "safety"<br/>
                                top_k: 3, min_score: 0.5<br/>
                                fulltext_weight: 0.5, semantic_weight: 0.5<br/>
                                + 4 more default parameters
                              </>
                            ) : (
                              <>
                                text_query: "travel information"<br/>
                                top_k: 5, min_score: 0.5<br/>
                                fulltext_weight: 0.5, semantic_weight: 0.5<br/>
                                + 3 more default parameters
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-purple-100 border border-purple-300 rounded p-2">
                      <strong>💡 Key Benefits:</strong>
                      <ul className="text-xs mt-1 space-y-1">
                        <li>• <strong>AI gets simple interface</strong> - only essential parameters</li>
                        <li>• <strong>System handles complexity</strong> - automatic defaults + mapping</li>
                        <li>• <strong>Full API coverage</strong> - all required fields are populated</li>
                        <li>• <strong>Consistent behavior</strong> - predictable results every time</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Function Configuration */}
              <div className="border rounded-lg p-4 bg-yellow-50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium text-yellow-900">🤖 AI Function Mapping</h4>
                    <p className="text-xs text-yellow-700 mt-1">
                      Create a simple function that AI can call, which maps to the complex tool configuration below
                    </p>
                  </div>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={showAIFunction} 
                      onChange={(e) => setShowAIFunction(e.target.checked)}
                      className="mr-2" 
                    /> 
                    <span className="text-sm text-yellow-800">Show AI Function Form</span>
                  </label>
                </div>
                
                {showAIFunction && (
                  <div className="space-y-4">
                    <div className="bg-yellow-100 border border-yellow-300 rounded p-3 mb-4">
                      <h5 className="font-medium text-yellow-800 mb-2">🎯 What This Does:</h5>
                      <div className="text-sm text-yellow-700 space-y-1">
                        <p>• <strong>AI Function:</strong> Simple parameters like <code>product_name</code></p>
                        <p>• <strong>Tool Execution:</strong> Maps to complex tool params like <code>path: "/products/{'{product_name}'}/price"</code></p>
                        <p>• <strong>Example:</strong> AI calls <code>get_product_price("iPhone")</code> → Tool executes <code>GET /products/iPhone/price</code></p>
                      </div>
                    </div>
                    
                    {/* AI Function Name and Description */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-yellow-800 mb-1">Function Name</label>
                        <input 
                          type="text" 
                          value={customAIFunction.name} 
                          onChange={(e) => setCustomAIFunction(prev => ({
                            ...prev,
                            name: e.target.value
                          }))}
                          className="w-full border border-yellow-300 rounded px-3 py-2 text-sm bg-white"
                          placeholder="e.g., get_product_price"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-yellow-800 mb-1">Function Description</label>
                        <input 
                          type="text" 
                          value={customAIFunction.description} 
                          onChange={(e) => setCustomAIFunction(prev => ({
                            ...prev,
                            description: e.target.value
                          }))}
                          className="w-full border border-yellow-300 rounded px-3 py-2 text-sm bg-white"
                          placeholder="e.g., Get the current price of a specific product"
                        />
                      </div>
                    </div>

                    {/* AI Function Parameters */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      {/* Enum Information Box */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <h5 className="font-medium text-blue-800 mb-3 text-lg">🎯 Parameter Constraints & Enums</h5>
                        <div className="text-sm text-blue-700 space-y-2">
                          <p>• <strong>String Parameters:</strong> Add enum values to restrict input (e.g., category: "safety,technical,policy")</p>
                          <p>• <strong>Enum Benefits:</strong> Prevents invalid inputs, improves AI accuracy, ensures consistent data</p>
                          <p>• <strong>Examples:</strong> priority: "low,medium,high" | status: "active,inactive,pending" | type: "document,image,video"</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-yellow-800">Parameters</label>
                        <button 
                          onClick={() => {
                            const paramName = `param_${Object.keys(customAIFunction.parameters.properties).length + 1}`;
                            setCustomAIFunction(prev => ({
                              ...prev,
                              parameters: {
                                ...prev.parameters,
                                properties: {
                                  ...prev.parameters.properties,
                                  [paramName]: {
                                    type: 'string',
                                    description: '',
                                    enum: undefined,
                                    // Suggest common enum patterns for string parameters
                                    _suggestedEnums: {
                                      'priority': 'low,medium,high',
                                      'status': 'active,inactive,pending',
                                      'category': 'general,specific,urgent',
                                      'type': 'document,image,video'
                                    }
                                  }
                                }
                              }
                            }));
                          }}
                          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 border border-blue-600 hover:border-blue-700 shadow-sm transition-colors duration-200 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Parameter
                        </button>
                      </div>
                      
                      {/* No column headers needed for 2-line layout */}
                      
                      <div className="space-y-3">
                        {Object.entries(customAIFunction.parameters.properties).map(([paramName, param]) => (
                          <div key={paramName} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                            {/* First Line: Name, Type, Required, Delete */}
                            <div className="grid grid-cols-12 gap-4 items-center mb-3">
                              <div className="col-span-4">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Parameter Name</label>
                                <input 
                                  defaultValue={paramName} 
                                  onBlur={(e) => {
                                    const newName = e.target.value.trim();
                                    if (newName && newName !== paramName) {
                                      const newProperties = { ...customAIFunction.parameters.properties };
                                      const oldParam = newProperties[paramName];
                                      delete newProperties[paramName];
                                      newProperties[newName] = oldParam;
                                      setCustomAIFunction(prev => ({
                                        ...prev,
                                        parameters: {
                                          ...prev.parameters,
                                          properties: newProperties
                                        }
                                      }));
                                    }
                                  }}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                  placeholder="e.g., priority, status, category"
                                />
                              </div>
                              <div className="col-span-3">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Data Type</label>
                                <div className="relative">
                                  <select 
                                    value={Array.isArray(param.type) ? param.type[0] : param.type} 
                                    onChange={(e) => {
                                      const newType = e.target.value === 'nullable' ? ['string', 'null'] : e.target.value;
                                      setCustomAIFunction(prev => ({
                                        ...prev,
                                        parameters: {
                                          ...prev.parameters,
                                          properties: {
                                            ...prev.parameters.properties,
                                            [paramName]: {
                                              ...prev.parameters.properties[paramName],
                                              type: newType,
                                              // Clear enum when type changes (unless it's still string-based)
                                              enum: newType === 'string' ? (prev.parameters.properties[paramName]?.enum || []) : undefined
                                            }
                                          }
                                        }
                                      }));
                                    }}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none cursor-pointer hover:border-gray-400 transition-colors duration-200"
                                  >
                                    <option value="string">String</option>
                                    <option value="number">Number</option>
                                    <option value="boolean">Boolean</option>
                                    <option value="array">Array</option>
                                    <option value="object">Object</option>
                                    <option value="nullable">Nullable String</option>
                                  </select>
                                  {/* Custom dropdown arrow */}
                                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                              <div className="col-span-3">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Required</label>
                                <label className="flex items-center h-10">
                                  <input 
                                    type="checkbox" 
                                    checked={customAIFunction.parameters.required.includes(paramName)} 
                                    onChange={(e) => {
                                      const newRequired = e.target.checked 
                                        ? [...customAIFunction.parameters.required, paramName]
                                        : customAIFunction.parameters.required.filter(r => r !== paramName);
                                      setCustomAIFunction(prev => ({
                                        ...prev,
                                        parameters: {
                                          ...prev.parameters,
                                          required: newRequired
                                        }
                                      }));
                                    }}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2" 
                                  /> 
                                  <span className="ml-2 text-sm text-gray-700">Required</span>
                                </label>
                              </div>
                              <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Action</label>
                                <button 
                                  onClick={() => {
                                    const newProperties = { ...customAIFunction.parameters.properties };
                                    delete newProperties[paramName];
                                    const newRequired = customAIFunction.parameters.required.filter(r => r !== paramName);
                                    setCustomAIFunction(prev => ({
                                      ...prev,
                                      parameters: {
                                        ...prev.parameters,
                                        properties: newProperties,
                                        required: newRequired
                                      }
                                    }));
                                  }}
                                  className="w-8 h-8 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md border border-red-200 hover:border-red-300 flex items-center justify-center text-lg font-bold"
                                  title="Delete parameter"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                            
                            {/* Second Line: Description and Enum Values */}
                            <div className="grid grid-cols-12 gap-4 items-start">
                              <div className="col-span-6">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                                <input 
                                  value={param.description} 
                                  onChange={(e) => setCustomAIFunction(prev => ({
                                    ...prev,
                                    parameters: {
                                      ...prev.parameters,
                                      properties: {
                                        ...prev.parameters.properties,
                                        [paramName]: {
                                          ...prev.parameters.properties[paramName],
                                          description: e.target.value
                                        }
                                      }
                                    }
                                  }))}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                  placeholder="Describe what this parameter does"
                                />
                              </div>
                              <div className="col-span-6">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Enum Values</label>
                                {/* Enum values input for string parameters */}
                                {(Array.isArray(param.type) ? param.type[0] === 'string' : param.type === 'string') && (
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <input 
                                        value={param.enum ? param.enum.join(', ') : ''} 
                                        onChange={(e) => {
                                          const enumValues = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                                          setCustomAIFunction(prev => ({
                                            ...prev,
                                            parameters: {
                                              ...prev.parameters,
                                              properties: {
                                                ...prev.parameters.properties,
                                                [paramName]: {
                                                  ...prev.parameters.properties[paramName],
                                                  enum: enumValues.length > 0 ? enumValues : undefined
                                                }
                                              }
                                            }
                                          }));
                                        }}
                                        className="flex-1 border border-blue-300 rounded-md px-3 py-2 text-sm bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                        placeholder="low,medium,high"
                                        title="Comma-separated enum values (optional)"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const suggestions = {
                                            'priority': 'low,medium,high',
                                            'status': 'active,inactive,pending',
                                            'category': 'general,specific,urgent',
                                            'type': 'document,image,video',
                                            'level': 'beginner,intermediate,advanced',
                                            'severity': 'low,medium,high,critical'
                                          };
                                          const currentName = paramName.toLowerCase();
                                          const suggestion = Object.entries(suggestions).find(([key]) => 
                                            currentName.includes(key) || key.includes(currentName)
                                          );
                                          if (suggestion) {
                                            setCustomAIFunction(prev => ({
                                              ...prev,
                                              parameters: {
                                                ...prev.parameters,
                                                properties: {
                                                  ...prev.parameters.properties,
                                                  [paramName]: {
                                                    ...prev.parameters.properties[paramName],
                                                    enum: suggestion[1].split(',')
                                                  }
                                                }
                                              }
                                            }));
                                          }
                                        }}
                                        className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 border border-blue-300"
                                        title="Get enum suggestions"
                                      >
                                        💡
                                      </button>
                                    </div>
                                    {param.enum && param.enum.length > 0 && (
                                      <div className="text-xs text-blue-600 mt-1 font-medium">
                                        ✓ {param.enum.length} values: {param.enum.join(', ')}
                                      </div>
                                    )}
                                    {param.type === 'string' && !param.enum && (
                                      <div className="text-xs text-gray-500 mt-1 italic">
                                        Optional: Add enum values to restrict input
                                      </div>
                                    )}
                                  </div>
                                )}
                                {!(Array.isArray(param.type) ? param.type[0] === 'string' : param.type === 'string') && (
                                  <div className="text-xs text-gray-400 italic bg-gray-50 px-3 py-2 rounded-md">
                                    Enum values only available for string parameters
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Parameter Mapping Info */}
                    <div className="bg-yellow-100 border border-yellow-300 rounded p-3">
                      <h5 className="font-medium text-yellow-800 mb-2">How Parameter Mapping Works</h5>
                      <div className="text-sm text-yellow-700 space-y-1">
                        <p>• <strong>AI Function:</strong> Simple parameters like <code>product_name</code></p>
                        <p>• <strong>Tool Execution:</strong> Maps to complex tool params like <code>path: "/products/{'{product_name}'}/price"</code></p>
                        <p>• <strong>Example:</strong> AI calls <code>get_product_price("iPhone")</code> → Tool executes <code>GET /products/iPhone/price</code></p>
                        <p>• <strong>Auto-Update:</strong> Selecting a mapping automatically updates the Request Body Mapping below</p>
                      </div>
                    </div>

                    {/* Parameter to Tool Mapping */}
                    {Object.keys(customAIFunction.parameters.properties).length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <h5 className="font-medium text-blue-800 mb-2">Parameter to Tool Mapping</h5>
                        <p className="text-sm text-blue-700 mb-3">
                          Map AI function parameters to actual tool parameters and configuration
                        </p>
                        {Object.keys(parameterMappings).some(key => parameterMappings[key]) && (
                          <div className="bg-green-50 border border-green-200 rounded p-2 mb-3">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-sm text-green-700 font-medium">
                                Mappings Connected: Request Body will auto-update when you select mappings
                              </span>
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          {Object.entries(customAIFunction.parameters.properties).map(([paramName, param]) => (
                            <div key={paramName} className="border rounded p-2 bg-white">
                              <div className="flex items-center gap-3">
                                <div className="w-24 text-sm font-medium text-blue-900">{paramName}:</div>
                                <div className="flex-1">
                                  <select 
                                    value={parameterMappings[paramName] || ''}
                                    onChange={(e) => {
                                      const newMapping = e.target.value;
                                      setParameterMappings(prev => ({
                                        ...prev,
                                        [paramName]: newMapping
                                      }));
                                      
                                      // Auto-update request body mapping
                                      if (newMapping && newMapping !== 'static' && newMapping !== 'config') {
                                        const paramType = customAIFunction.parameters.properties[paramName]?.type;
                                        const isString = Array.isArray(paramType) ? paramType[0] === 'string' : paramType === 'string';
                                        const value = isString ? `"$${paramName}"` : `$${paramName}`;
                                        
                                        // Update the request body
                                        const currentBody = toolConfig.arg_defaults.request_body || '';
                                        let updatedBody = currentBody;
                                        
                                        // Replace the mapping in the request body
                                        updatedBody = updatedBody.replace(
                                          new RegExp(`"${newMapping}": "[^"]*"`, 'g'),
                                          `"${newMapping}": ${value}`
                                        );
                                        updatedBody = updatedBody.replace(
                                          new RegExp(`"${newMapping}": [^,}\\s]+`, 'g'),
                                          `"${newMapping}": ${value}`
                                        );
                                        
                                        setToolConfig(prev => ({
                                          ...prev,
                                          arg_defaults: { ...prev.arg_defaults, request_body: updatedBody }
                                        }));
                                      }
                                    }}
                                    className="w-full border rounded px-2 py-1 text-sm"
                                  >
                                    <option value="">-- Map to Tool Param --</option>
                                    {selectedToolDef?.parameters.map(toolParam => (
                                      <option key={toolParam.name} value={toolParam.name}>
                                        {toolParam.name} ({toolParam.type})
                                      </option>
                                    ))}
                                    <option value="static">Static Value</option>
                                    <option value="config">Tool Config Field</option>
                                  </select>
                                </div>
                                <div className="text-xs text-blue-600">
                                  {param.type} • {customAIFunction.parameters.required.includes(paramName) ? 'Required' : 'Optional'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Basic Settings */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">🔧 Basic Tool Settings</h4>
                <p className="text-xs text-gray-600 mb-3">
                  Configure how this tool appears and behaves in the agent's tool list
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alias (Optional)</label>
                    <input 
                      value={toolConfig.alias} 
                      onChange={(e) => setToolConfig(prev => ({ ...prev, alias: e.target.value }))}
                      className="w-full border rounded px-3 py-2" 
                      placeholder="Custom name for this tool"
                    />
                    <p className="text-xs text-gray-500 mt-1">Give this tool a friendly name</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                    <input 
                      type="number" 
                      value={toolConfig.position} 
                      onChange={(e) => setToolConfig(prev => ({ ...prev, position: Number(e.target.value) }))}
                      className="w-full border rounded px-3 py-2" 
                    />
                    <p className="text-xs text-gray-500 mt-1">Order in tool list</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={toolConfig.enabled} 
                    onChange={(e) => setToolConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="mr-2" 
                  /> 
                  <label className="text-sm text-gray-700">Enabled</label>
                </div>
              </div>

              {/* Tool Execution Configuration */}
              {selectedToolDef && selectedToolDef.parameters.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">⚙️ Tool Execution Configuration</h4>
                  <p className="text-xs text-gray-600 mb-3">
                    Configure how the tool executes when called. These are the actual values and settings used by the tool.
                  </p>
                  
                  {/* RAG Tools Special Note */}
                  {selectedTool && selectedTool.startsWith('skill.rag.') && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <h5 className="font-medium text-blue-800 mb-2">🔍 RAG Tools - Complete Request Body Mapping</h5>
                      <div className="text-sm text-blue-700 space-y-2">
                        <p><strong>Map AI function parameters to API request body fields:</strong></p>
                        <div className="bg-white border rounded p-2 text-xs font-mono">
                          {selectedTool === 'skill.rag.place' ? (
                            <>
                              <strong>API Endpoint:</strong> POST /api/rag/place<br/>
                              <strong>Request Body Fields:</strong><br/>
                              • text_query: $text_query_str (from AI)<br/>
                              • lat: $lat_num (from AI)<br/>
                              • long: $long_num (from AI)<br/>
                              • max_distance_km: 5 (default)<br/>
                              • distance_weight: 1 (default)<br/>
                              • top_k: 3 (default)<br/>
                              • min_score: 0.5 (default)<br/>
                              • fulltext_weight: 0.5 (default)<br/>
                              • semantic_weight: 0.5 (default)<br/>
                              • intent_scope: "" (default)<br/>
                              • intent_action: "" (default)<br/>
                              • simantic_query: "" (default)<br/>
                              • prompt_key: "" (default)<br/>
                              • prompt_params: null (default)
                            </>
                          ) : selectedTool === 'skill.rag.search' ? (
                            <>
                              <strong>API Endpoint:</strong> POST /api/rag/summary<br/>
                              <strong>Request Body Fields:</strong><br/>
                              • text_query: $text_query_str (from AI)<br/>
                              • category: $category_str (from AI, optional)<br/>
                              • top_k: 3 (default)<br/>
                              • min_score: 0.5 (default)<br/>
                              • fulltext_weight: 0.5 (default)<br/>
                              • semantic_weight: 0.5 (default)<br/>
                              • intent_scope: "" (default)<br/>
                              • intent_action: "" (default)<br/>
                              • simantic_query: "" (default)<br/>
                              • prompt_key: "" (default)<br/>
                              • prompt_params: null (default)
                            </>
                          ) : (
                            <>
                              <strong>API Endpoint:</strong> POST /api/rag/contexts<br/>
                              <strong>Request Body Fields:</strong><br/>
                              • text_query: $text_query_str (from AI)<br/>
                              • category: $category_str (from AI, optional)<br/>
                              • top_k: 3 (default)<br/>
                              • min_score: 0.5 (default)<br/>
                              • fulltext_weight: 0.5 (default)<br/>
                              • semantic_weight: 0.5 (default)<br/>
                              • intent_scope: "" (default)<br/>
                              • intent_action: "" (default)<br/>
                              • simantic_query: "" (default)
                            </>
                          )}
                        </div>
                        <p className="text-xs text-blue-600">
                          <strong>Note:</strong> Use <code>$parameter_name</code> syntax to map AI function parameters to API fields.
                          Fields without mapping get default values.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* HTTP Request Special Note */}
                  {selectedTool === 'skill.http.request' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <h5 className="font-medium text-yellow-800 mb-2">🌐 HTTP Request - Flexible Textarea Mapping</h5>
                      <div className="text-sm text-yellow-700 space-y-2">
                        <p><strong>Map AI function parameters to HTTP request components using large textareas:</strong></p>
                        <div className="bg-white border rounded p-2 text-xs font-mono">
                          • <strong>URL:</strong> Use $parameter_name for dynamic parts<br/>
                          • <strong>Headers:</strong> Large textarea for complex JSON with $variable substitution<br/>
                          • <strong>Body:</strong> Large textarea for complex JSON with $parameter mapping (includes query params)
                        </div>
                        <p className="text-xs text-yellow-600">
                          <strong>Key Feature:</strong> Large textareas allow complex JSON structures and extensive parameter mapping
                        </p>
                        <p className="text-xs text-yellow-600">
                          <strong>Example:</strong> <code>{"{product_id}"}</code> becomes <code>$product_id</code> in the mapping
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Request Body Mapping */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-700">Request Body Mapping</h5>
                    <p className="text-xs text-gray-500 mb-2">
                      Map AI function parameters to API request body fields. Use <code>$parameter_name</code> syntax for dynamic values.
                    </p>
                    
                    {selectedTool && (selectedTool.startsWith('skill.rag.') || selectedTool === 'skill.http.request') ? (
                      // RAG Tools and HTTP Request - Show complete API request body mapping
                      <div className="space-y-3">
                        {/* RAG Tools - Single Textarea for Request Body */}
                        {selectedTool && selectedTool.startsWith('skill.rag.') && (
                          <div className="space-y-3">
                            <div className="border rounded p-4 bg-gray-50">
                              <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-medium text-gray-700">Request Body Mapping</label>
                                <span className="text-xs text-gray-500">JSON with $parameter mapping</span>
                              </div>
                              <textarea
                                value={toolConfig.arg_defaults.request_body || generateRequestBodyMapping()}
                                onChange={(e) => setToolConfig(prev => ({
                                  ...prev,
                                  arg_defaults: { ...prev.arg_defaults, request_body: e.target.value }
                                }))}
                                className="w-full h-40 border rounded px-3 py-2 font-mono text-sm resize-y"
                                placeholder="Enter JSON request body with $parameter mapping..."
                              />
                              <p className="text-xs text-gray-500 mt-2">
                                Use <code>$parameter_name</code> syntax to map AI function parameters. 
                                All fields are included - map only what you need, others get default values.
                              </p>
                            </div>
                          </div>
                        )}





                        {/* HTTP Request Tool - Flexible Textarea Mapping */}
                        {selectedTool === 'skill.http.request' && (
                          <div className="space-y-3">
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                              <h5 className="font-medium text-yellow-800 mb-2">🌐 HTTP Request - Flexible Textarea Mapping</h5>
                              <div className="text-sm text-yellow-700 space-y-2">
                                <p><strong>Map AI function parameters to HTTP request components using large textareas:</strong></p>
                                <div className="bg-white border rounded p-2 text-xs font-mono">
                                  • <strong>URL:</strong> Use $parameter_name for dynamic parts<br/>
                                  • <strong>Headers:</strong> Large textarea for complex JSON with $variable substitution<br/>
                                  • <strong>Body:</strong> Large textarea for complex JSON with $parameter mapping (includes query params)
                                </div>
                                <p className="text-xs text-yellow-600">
                                  <strong>Key Feature:</strong> Large textareas allow complex JSON structures and extensive parameter mapping
                                </p>
                                <p className="text-xs text-yellow-600">
                                  <strong>Example:</strong> <code>{"{product_id}"}</code> becomes <code>$product_id</code> in the mapping
                                </p>
                              </div>
                            </div>

                            {/* HTTP Method */}
                            <div className="border rounded p-3 bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700">HTTP Method</label>
                                <span className="text-xs text-gray-500">string (Required)</span>
                              </div>
                              <select 
                                value={toolConfig.arg_defaults.method || 'GET'} 
                                onChange={(e) => setToolConfig(prev => ({
                                  ...prev,
                                  arg_defaults: { ...prev.arg_defaults, method: e.target.value }
                                }))}
                                className="w-full border rounded px-2 py-1 font-mono text-sm"
                              >
                                <option value="GET">GET</option>
                                <option value="POST">POST</option>
                                <option value="PUT">PUT</option>
                                <option value="DELETE">DELETE</option>
                                <option value="PATCH">PATCH</option>
                              </select>
                              <p className="text-xs text-gray-500 mt-1">HTTP method for the request</p>
                            </div>

                            {/* Base URL */}
                            <div className="border rounded p-3 bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700">Base URL</label>
                                <span className="text-xs text-gray-500">string (Required)</span>
                              </div>
                              <input 
                                type="text"
                                value={toolConfig.arg_defaults.baseUrl || 'https://api.example.com'} 
                                onChange={(e) => setToolConfig(prev => ({
                                  ...prev,
                                  arg_defaults: { ...prev.arg_defaults, baseUrl: e.target.value }
                                }))}
                                className="w-full border rounded px-2 py-1 font-mono text-sm" 
                                placeholder="https://api.example.com"
                              />
                              <p className="text-xs text-gray-500 mt-1">Base URL for the API endpoint</p>
                            </div>

                            {/* Path Template */}
                            <div className="border rounded p-3 bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700">Path Template</label>
                                <span className="text-xs text-gray-500">string (Required)</span>
                              </div>
                              <input 
                                type="text"
                                value={toolConfig.arg_defaults.path || '/api/products/{product_id}'} 
                                onChange={(e) => setToolConfig(prev => ({
                                  ...prev,
                                  arg_defaults: { ...prev.arg_defaults, path: e.target.value }
                                }))}
                                className="w-full border rounded px-2 py-1 font-mono text-sm" 
                                placeholder="/api/products/{product_id}"
                              />
                              <p className="text-xs text-gray-500 mt-1">URL path with {'{parameter}'} placeholders</p>
                            </div>

                            {/* Headers Mapping */}
                            <div className="border rounded p-3 bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700">Headers Mapping</label>
                                <span className="text-xs text-gray-500">JSON (Optional)</span>
                              </div>
                              <textarea 
                                value={toolConfig.arg_defaults.headers || '{\n  "Authorization": "Bearer $api_token",\n  "Content-Type": "application/json",\n  "User-Agent": "AI-Agent/1.0",\n  "X-Custom-Header": "$custom_value"\n}'} 
                                onChange={(e) => setToolConfig(prev => ({
                                  ...prev,
                                  arg_defaults: { ...prev.arg_defaults, headers: e.target.value }
                                }))}
                                className="w-full border rounded px-3 py-2 font-mono text-sm h-32 resize-y" 
                                placeholder='{\n  "Authorization": "Bearer $api_token",\n  "Content-Type": "application/json",\n  "X-Custom-Header": "$custom_value"\n}'
                              />
                              <p className="text-xs text-gray-500 mt-1">HTTP headers with $parameter substitution. Use large textarea for complex mapping.</p>
                            </div>

                            {/* Body Mapping */}
                            <div className="border rounded p-3 bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700">Body Mapping</label>
                                <span className="text-xs text-gray-500">JSON (Optional)</span>
                              </div>
                              <textarea 
                                value={toolConfig.arg_defaults.body || '{\n  "product_id": "$product_id",\n  "quantity": "$quantity",\n  "user_id": "$user_id",\n  "query_params": {\n    "page": "$page_num",\n    "limit": "$page_size",\n    "sort": "$sort_by"\n  },\n  "metadata": {\n    "source": "ai_agent",\n    "timestamp": "$current_time"\n  },\n  "options": {\n    "priority": "$priority_level",\n    "category": "$product_category"\n  }\n}'} 
                                onChange={(e) => setToolConfig(prev => ({
                                  ...prev,
                                  arg_defaults: { ...prev.arg_defaults, body: e.target.value }
                                }))}
                                className="w-full border rounded px-3 py-2 font-mono text-sm h-40 resize-y" 
                                placeholder='{\n  "product_id": "$product_id",\n  "quantity": "$quantity",\n  "query_params": {\n    "page": "$page_num",\n    "limit": "$page_size"\n  },\n  "metadata": {\n    "source": "ai_agent"\n  }\n}'
                              />
                              <p className="text-xs text-gray-500 mt-1">Request body with $parameter mapping (includes query parameters). Use large textarea for complex JSON structures.</p>
                            </div>

                            {/* Timeout */}
                            <div className="border rounded p-3 bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700">Timeout (ms)</label>
                                <span className="text-xs text-gray-500">number (Default)</span>
                              </div>
                              <input 
                                type="text"
                                value={toolConfig.arg_defaults.timeout || '5000'} 
                                onChange={(e) => setToolConfig(prev => ({
                                  ...prev,
                                  arg_defaults: { ...prev.arg_defaults, timeout: e.target.value }
                                }))}
                                className="w-full border rounded px-2 py-1 font-mono text-sm" 
                                placeholder="5000"
                              />
                              <p className="text-xs text-gray-500 mt-1">Request timeout in milliseconds</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Non-RAG Tools - Show original parameter defaults
                      selectedToolDef.parameters.map((param) => (
                        <div key={param.name} className="border rounded p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700">{param.name}</label>
                            <span className="text-xs text-gray-500">{param.type}</span>
                          </div>
                          {param.type === 'enum' ? (
                            <select 
                              value={toolConfig.arg_defaults[param.name] || ''} 
                              onChange={(e) => setToolConfig(prev => ({
                                ...prev,
                                arg_defaults: { ...prev.arg_defaults, [param.name]: e.target.value }
                              }))}
                              className="w-full border rounded px-2 py-1"
                            >
                              <option value="">-- Select Default --</option>
                              {param.enum?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : param.type === 'number' ? (
                            <input 
                              type="number" 
                              value={toolConfig.arg_defaults[param.name] || ''} 
                              onChange={(e) => setToolConfig(prev => ({
                                ...prev,
                                arg_defaults: { ...prev.arg_defaults, [param.name]: Number(e.target.value) }
                              }))}
                              className="w-full border rounded px-2 py-1"
                              placeholder={`Default ${param.name}`}
                            />
                          ) : (
                            <input 
                              type="text" 
                              value={toolConfig.arg_defaults[param.name] || ''} 
                              onChange={(e) => setToolConfig(prev => ({
                                ...prev,
                                arg_defaults: { ...prev.arg_defaults, [param.name]: e.target.value }
                              }))}
                              className="w-full border rounded px-2 py-1"
                              placeholder={`Default ${param.name}`}
                              />
                            )}
                          <p className="text-xs text-gray-600 mt-1">{param.description}</p>
                          {param.required && <span className="text-xs text-red-500">Required</span>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Configuration Fields */}
              {selectedToolDef && selectedToolDef.configFields.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">🔧 Tool Settings</h4>
                  <p className="text-xs text-gray-600 mb-3">
                    Configure tool-specific behavior and constraints. These affect how the tool operates.
                  </p>
                  <div className="space-y-3">
                    {selectedToolDef.configFields.map((field) => (
                      <div key={field.name} className="border rounded p-3 bg-blue-50">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-blue-700">{field.name}</label>
                          <span className="text-xs text-blue-500">{field.type}</span>
                        </div>
                        {field.type === 'enum' ? (
                          <select 
                            value={toolConfig.overrides[field.name] || ''} 
                            onChange={(e) => setToolConfig(prev => ({
                              ...prev,
                              overrides: { ...prev.overrides, [field.name]: e.target.value }
                            }))}
                            className="w-full border rounded px-2 py-1"
                          >
                            <option value="">-- Select Setting --</option>
                            {field.enum?.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : field.type === 'number' ? (
                          <input 
                            type="number" 
                            value={toolConfig.overrides[field.name] || ''} 
                            onChange={(e) => setToolConfig(prev => ({
                              ...prev,
                              overrides: { ...prev.overrides, [field.name]: Number(e.target.value) }
                            }))}
                            className="w-full border rounded px-2 py-1"
                            placeholder={field.placeholder || `Enter ${field.name}`}
                          />
                        ) : field.type === 'array' ? (
                          <input 
                            type="text" 
                            value={toolConfig.overrides[field.name] || ''} 
                            onChange={(e) => setToolConfig(prev => ({
                              ...prev,
                              overrides: { ...prev.overrides, [field.name]: e.target.value.split(',').map(s => s.trim()) }
                            }))}
                            className="w-full border rounded px-2 py-1"
                            placeholder={field.placeholder || `Comma-separated values`}
                          />
                        ) : (
                          <input 
                            type="text" 
                            value={toolConfig.overrides[field.name] || ''} 
                            onChange={(e) => setToolConfig(prev => ({
                              ...prev,
                              overrides: { ...prev.overrides, [field.name]: e.target.value }
                            }))}
                            className="w-full border rounded px-2 py-1"
                            placeholder={field.placeholder || `Enter ${field.name}`}
                          />
                        )}
                        <p className="text-xs text-blue-600 mt-1">{field.description}</p>
                        {field.required && <span className="text-xs text-red-500">Required</span>}
                        {field.default !== undefined && (
                          <p className="text-xs text-blue-500 mt-1">Default: {field.default}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button 
                  onClick={() => router.push(`/admin/agents/${encodeURIComponent(agentKey)}/tools`)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveTool}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save Tool
                </button>
              </div>

              {/* Tool Testing Section */}
              {selectedTool && Object.keys(customAIFunction.parameters.properties).length > 0 && (
                <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    🧪 Test Tool Execution
                    <span className="text-sm font-normal text-gray-600">(AI Perspective)</span>
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Test how this tool will execute when called by AI. Provide example parameter values to see the actual API call and response.
                  </p>
                  
                  {/* Test Parameter Inputs */}
                  <div className="space-y-4 mb-6">
                    <h5 className="font-medium text-gray-800">Test Parameters</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(customAIFunction.parameters.properties).map(([paramName, param]) => (
                        <div key={paramName} className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            {paramName}
                            {customAIFunction.parameters.required.includes(paramName) && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                            <span className="text-xs text-gray-500 ml-2">
                              ({Array.isArray(param.type) ? param.type[0] : param.type})
                            </span>
                          </label>
                          {param.enum && param.enum.length > 0 ? (
                            <select
                              value={testParams[paramName] || ''}
                              onChange={(e) => setTestParams(prev => ({ ...prev, [paramName]: e.target.value }))}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Select {paramName}...</option>
                              {param.enum.map(enumValue => (
                                <option key={enumValue} value={enumValue}>{enumValue}</option>
                              ))}
                            </select>
                          ) : Array.isArray(param.type) ? param.type[0] === 'string' ? (
                            <input
                              type="text"
                              value={testParams[paramName] || ''}
                              onChange={(e) => setTestParams(prev => ({ ...prev, [paramName]: e.target.value }))}
                              placeholder={`Enter ${paramName}...`}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          ) : param.type[0] === 'number' ? (
                            <input
                              type="number"
                              value={testParams[paramName] || ''}
                              onChange={(e) => setTestParams(prev => ({ ...prev, [paramName]: e.target.value }))}
                              placeholder={`Enter ${paramName}...`}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          ) : param.type[0] === 'boolean' ? (
                            <select
                              value={testParams[paramName] || ''}
                              onChange={(e) => setTestParams(prev => ({ ...prev, [paramName]: e.target.value }))}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Select {paramName}...</option>
                              <option value="true">true</option>
                              <option value="false">false</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={testParams[paramName] || ''}
                              onChange={(e) => setTestParams(prev => ({ ...prev, [paramName]: e.target.value }))}
                              placeholder={`Enter ${paramName}...`}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          ) : param.type === 'string' ? (
                            <input
                              type="text"
                              value={testParams[paramName] || ''}
                              onChange={(e) => setTestParams(prev => ({ ...prev, [paramName]: e.target.value }))}
                              placeholder={`Enter ${paramName}...`}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          ) : param.type === 'number' ? (
                            <input
                              type="number"
                              value={testParams[paramName] || ''}
                              onChange={(e) => setTestParams(prev => ({ ...prev, [paramName]: e.target.value }))}
                              placeholder={`Enter ${paramName}...`}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          ) : param.type === 'boolean' ? (
                            <select
                              value={testParams[paramName] || ''}
                              onChange={(e) => setTestParams(prev => ({ ...prev, [paramName]: e.target.value }))}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Select {paramName}...</option>
                              <option value="true">true</option>
                              <option value="false">false</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={testParams[paramName] || ''}
                              onChange={(e) => setTestParams(prev => ({ ...prev, [paramName]: e.target.value }))}
                              placeholder={`Enter ${paramName}...`}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          )}
                          {param.description && (
                            <p className="text-xs text-gray-500">{param.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Test Button */}
                  <div className="flex gap-3 mb-4">
                    <button
                      onClick={testToolExecution}
                      disabled={testing || !isTestParamsValid()}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {testing ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Testing...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Test Tool Execution
                        </>
                      )}
                    </button>
                    <button
                      onClick={clearTestResults}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Clear Results
                    </button>
                  </div>

                  {/* Test Results */}
                  {testResults && (
                    <div className="space-y-4">
                      <h5 className="font-medium text-gray-800">Test Results</h5>
                      
                      {/* Generated API Call */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h6 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Generated API Call
                        </h6>
                        <div className="bg-white border rounded p-3">
                          <div className="text-sm font-mono text-gray-800">
                            <div className="mb-2">
                              <span className="text-blue-600 font-semibold">Method:</span> {testResults.method}
                            </div>
                            <div className="mb-2">
                              <span className="text-blue-600 font-semibold">URL:</span> {testResults.url}
                            </div>
                            <div className="mb-2">
                              <span className="text-blue-600 font-semibold">Headers:</span>
                              <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                {JSON.stringify(testResults.headers, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <span className="text-blue-600 font-semibold">Body:</span>
                              <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                {JSON.stringify(testResults.body, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* API Response */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h6 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          API Response
                        </h6>
                        <div className="bg-white border rounded p-3">
                          <div className="text-sm">
                            <div className="mb-2">
                              <span className="text-green-600 font-semibold">Status:</span> {testResults.response.status}
                            </div>
                            <div>
                              <span className="text-green-600 font-semibold">Response:</span>
                              <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto max-h-64">
                                {JSON.stringify(testResults.response.data, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
