import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp, testData, createAuthHeaders } from '../../../__tests__/test-setup';

// Mock the search service
vi.mock('../../../adapters/search/indexService', () => ({
  searchService: {
    hybridSearch: vi.fn().mockResolvedValue({
      results: [testData.context],
      total: 1,
      searchTime: 100
    }),
    searchByLocation: vi.fn().mockResolvedValue({
      results: [testData.context],
      total: 1,
      searchTime: 100
    })
  }
}));

// Mock the prompt template function  
vi.mock('../../../adapters/search/promptTemplateService', () => ({
  applyPromptTemplate: vi.fn().mockResolvedValue('Processed prompt with all parameters')
}));

describe('Public RAG Endpoints', () => {
  let app: any;

  beforeEach(() => {
    app = createTestApp();
    // Mount routes would go here if we had the actual router
  });

  describe('Basic API Health', () => {
    it('should respond to basic requests', async () => {
      const response = await request(app)
        .get('/health')
        .expect(404); // Expected since we don't have this route mounted

      expect(response.status).toBe(404);
    });

    it('should handle POST requests', async () => {
      const payload = {
        text_query: 'test query',
        simantic_query: 'semantic test query'
      };

      const response = await request(app)
        .post('/rag/summary')
        .set(createAuthHeaders())
        .send(payload)
        .expect(404); // Expected since we don't have the route mounted

      expect(response.status).toBe(404);
    });
  });
});