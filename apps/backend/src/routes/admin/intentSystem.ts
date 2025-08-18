import { Router } from 'express';
import { Pool } from 'pg';
import { IntentSystemRepository } from '../../repositories/intentSystemRepository.js';
import { QueryLogsRepository } from '../../repositories/queryLogsRepository';

export function buildIntentSystemRouter(pool: Pool) {
  const router = Router();
  const repo = new IntentSystemRepository(pool);
  const logsRepo = new QueryLogsRepository(pool);

  // Get scopes with their actions (hierarchical)
  router.get('/scopes-with-actions', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const scopesWithActions = await repo.getScopesWithActions(tenantId);
      res.json({ scopes: scopesWithActions });
    } catch (e) { 
      next(e); 
    }
  });

  // List all scopes
  router.get('/scopes', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const scopes = await repo.listScopes(tenantId);
      res.json({ scopes });
    } catch (e) { 
      next(e); 
    }
  });

  // List actions (optionally filtered by scope)
  router.get('/actions', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const scopeId = req.query.scope_id as string;
      const actions = await repo.listActions(tenantId, scopeId);
      res.json({ actions });
    } catch (e) { 
      next(e); 
    }
  });

  // Create scope
  router.post('/scopes', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const scope = await repo.createScope(tenantId, req.body);
      try {
        await logsRepo.create(tenantId, {
          userId: (req as any).userId || null,
          action: 'CREATE',
          resource: 'intent_scope',
          resourceId: scope.id,
          details: `Created scope ${scope.name}`,
          request: { body: req.body },
          response: { id: scope.id },
        });
      } catch {}
      res.status(201).json(scope);
    } catch (e) { 
      next(e); 
    }
  });

  // Update scope
  router.put('/scopes/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const id = req.params.id;
      const updated = await repo.updateScope(tenantId, id, req.body);
      if (!updated) return res.status(404).json({ message: 'Not found' });
      try {
        await logsRepo.create(tenantId, {
          userId: (req as any).userId || null,
          action: 'UPDATE',
          resource: 'intent_scope',
          resourceId: id,
          details: `Updated scope ${updated.name}`,
          request: { body: req.body },
          response: { id },
        });
      } catch {}
      res.json(updated);
    } catch (e) { 
      next(e); 
    }
  });

  // Delete scope
  router.delete('/scopes/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const id = req.params.id;
      const ok = await repo.deleteScope(tenantId, id);
      try {
        await logsRepo.create(tenantId, {
          userId: (req as any).userId || null,
          action: 'DELETE',
          resource: 'intent_scope',
          resourceId: id,
          details: `Deleted scope ${id}`,
          request: { params: req.params },
          response: { id },
        });
      } catch {}
      res.json({ ok });
    } catch (e) { 
      next(e); 
    }
  });

  // Create action
  router.post('/actions', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const action = await repo.createAction(tenantId, req.body);
      try {
        await logsRepo.create(tenantId, {
          userId: (req as any).userId || null,
          action: 'CREATE',
          resource: 'intent_action',
          resourceId: action.id,
          details: `Created action ${action.name}`,
          request: { body: req.body },
          response: { id: action.id },
        });
      } catch {}
      res.status(201).json(action);
    } catch (e) { 
      next(e); 
    }
  });

  // Update action
  router.put('/actions/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const id = req.params.id;
      const updated = await repo.updateAction(tenantId, id, req.body);
      if (!updated) return res.status(404).json({ message: 'Not found' });
      try {
        await logsRepo.create(tenantId, {
          userId: (req as any).userId || null,
          action: 'UPDATE',
          resource: 'intent_action',
          resourceId: id,
          details: `Updated action ${updated.name}`,
          request: { body: req.body },
          response: { id },
        });
      } catch {}
      res.json(updated);
    } catch (e) { 
      next(e); 
    }
  });

  // Delete action
  router.delete('/actions/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const id = req.params.id;
      const ok = await repo.deleteAction(tenantId, id);
      try {
        await logsRepo.create(tenantId, {
          userId: (req as any).userId || null,
          action: 'DELETE',
          resource: 'intent_action',
          resourceId: id,
          details: `Deleted action ${id}`,
          request: { params: req.params },
          response: { id },
        });
      } catch {}
      res.json({ ok });
    } catch (e) { 
      next(e); 
    }
  });

  return router;
}
