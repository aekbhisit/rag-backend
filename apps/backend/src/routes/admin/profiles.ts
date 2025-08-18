import { Router } from 'express'
import type { Pool } from 'pg'
import { z } from 'zod'
import { InstructionProfilesRepository } from '../../repositories/instructionProfilesRepository'

const CreateProfileSchema = z.object({
  name: z.string().min(1),
  version: z.number().int().optional(),
  answer_style: z.record(z.unknown()).optional(),
  retrieval_policy: z.record(z.unknown()).optional(),
  trust_safety: z.record(z.unknown()).optional(),
  glossary: z.record(z.unknown()).optional(),
  ai_instruction_message: z.string().min(1),
  is_active: z.boolean().optional(),
  min_trust_level: z.number().int().min(0).max(10).optional(),
})

export function buildProfilesRouter(pool: Pool) {
  const repo = new InstructionProfilesRepository(pool)
  const router = Router()

  router.get('/', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString()
      const q = typeof req.query.q === 'string' ? req.query.q : undefined
      const items = await repo.list(tenantId, q)
      res.json({ items, total: items.length })
    } catch (e) { next(e) }
  })

  router.post('/', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString()
      const input = CreateProfileSchema.parse(req.body)
      const created = await repo.create(tenantId, input as any)
      res.status(201).json(created)
    } catch (e) { next(e) }
  })

  router.put('/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString()
      const id = req.params.id
      const patch = CreateProfileSchema.partial().parse(req.body)
      const updated = await repo.update(tenantId, id, patch as any)
      if (!updated) return res.status(404).json({ message: 'Not found' })
      res.json(updated)
    } catch (e) { next(e) }
  })

  router.delete('/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString()
      const id = req.params.id
      const ok = await repo.delete(tenantId, id)
      res.status(ok ? 204 : 404).end()
    } catch (e) { next(e) }
  })

  return router
}
