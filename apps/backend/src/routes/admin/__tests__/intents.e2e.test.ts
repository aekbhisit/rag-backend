import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { buildIntentsRouter } from '../intents'
import { buildContextsRouter } from '../contexts'

// naive pg pool stub
const pool: any = {
  query: async (sql: string, params: any[]) => {
    if (sql.includes('SELECT id, tenant_id, scope')) {
      return { rows: [
        { id: 'i1', tenant_id: params[0], scope: 'general', action: 'question', description: null, created_at: new Date().toISOString() },
      ] }
    }
    throw new Error('not-implemented')
  }
}

function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use((req, _res, next) => { (req as any).tenantId = 't1'; next() })
  app.use('/api/admin/intents', buildIntentsRouter(pool))
  app.use('/api/admin/contexts', buildContextsRouter(undefined))
  return app
}

describe('Intents routes', () => {
  it('lists intents', async () => {
    const app = createTestApp()
    const res = await request(app).get('/api/admin/intents').set('X-Tenant-ID', 't1')
    expect(res.status).toBe(200)
    expect(res.body.items.length).toBeGreaterThan(0)
    expect(res.body.items[0].scope).toBe('general')
  })

  it('imports a context with embedding', async () => {
    const app = createTestApp()
    const payload = {
      type: 'text',
      title: 'Hello',
      body: 'World',
      attributes: { source: 'test' },
      trust_level: 1,
      keywords: ['k1','k2'],
      embedding: [0.1,0.2,0.3]
    }
    const res = await request(app)
      .post('/api/admin/contexts/import')
      .set('X-Tenant-ID', 't1')
      .send(payload)
    expect(res.status).toBe(201)
    expect(res.body.title).toBe('Hello')
  })
})
