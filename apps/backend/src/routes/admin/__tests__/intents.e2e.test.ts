import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { buildIntentsRouter } from '../intents'

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
  app.use((req, _res, next) => { (req as any).tenantId = 't1'; next() })
  app.use('/api/admin/intents', buildIntentsRouter(pool))
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
})
