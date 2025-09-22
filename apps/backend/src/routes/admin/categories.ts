import { Router } from 'express';
import { Pool } from 'pg';
import { CategoriesRepository } from '../../repositories/categoriesRepository.js';
import { getTenantIdFromReq } from '../../config/tenant';
import { QueryLogsRepository } from '../../repositories/queryLogsRepository';

export function buildCategoriesRouter(pool: Pool) {
  const router = Router();
  const repo = new CategoriesRepository(pool);
  const logsRepo = new QueryLogsRepository(pool);

  // List all categories (flat or hierarchical)
  router.get('/', async (req, res, next) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      const hierarchy = req.query.hierarchy === 'true';
      
      console.log('Categories request:', { tenantId, hierarchy, query: req.query });
      
      let categories;
      if (hierarchy) {
        try {
          categories = await repo.getHierarchy(tenantId);
        } catch (hierarchyError) {
          console.error('Hierarchy query failed:', hierarchyError);
          // Fallback to flat list if hierarchy fails
          console.log('Falling back to flat list due to hierarchy error');
          try {
            categories = await repo.list(tenantId);
          } catch (listError) {
            console.error('Flat list also failed:', listError);
            throw new Error(`Both hierarchy and flat list queries failed. Hierarchy: ${hierarchyError.message}, List: ${listError.message}`);
          }
        }
      } else {
        try {
          categories = await repo.list(tenantId);
        } catch (listError) {
          console.error('Flat list query failed:', listError);
          throw new Error(`List query failed: ${listError.message}`);
        }
      }
      
      console.log(`Categories request successful: ${categories.length} categories returned`);
      res.json({ categories });
    } catch (e) { 
      console.error('Error in categories route:', {
        error: e,
        stack: e instanceof Error ? e.stack : undefined,
        tenantId: req.header('X-Tenant-ID'),
        query: req.query,
        method: req.method,
        url: req.url
      });
      next(e); 
    }
  });

  // Get single category
  router.get('/:id', async (req, res, next) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      const category = await repo.get(tenantId, req.params.id);
      
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      res.json(category);
    } catch (e) { 
      next(e); 
    }
  });

  // Create category
  router.post('/', async (req, res, next) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      const category = await repo.create(tenantId, req.body);
      // Audit: category create
      try {
        await logsRepo.create(tenantId, {
          userId: (req as any).userId || null,
          action: 'CREATE',
          resource: 'category',
          resourceId: category.id,
          details: `Created category ${category.name}`,
          request: { body: req.body },
          response: { id: category.id },
        });
      } catch {}
      res.status(201).json(category);
    } catch (e) { 
      next(e); 
    }
  });

  // Update category
  router.put('/:id', async (req, res, next) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      const category = await repo.update(tenantId, req.params.id, req.body);
      
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      // Audit: category update
      try {
        await logsRepo.create(tenantId, {
          userId: (req as any).userId || null,
          action: 'UPDATE',
          resource: 'category',
          resourceId: category.id,
          details: `Updated category ${category.name}`,
          request: { body: req.body },
          response: { id: category.id },
        });
      } catch {}
      res.json(category);
    } catch (e) { 
      next(e); 
    }
  });

  // Delete category
  router.delete('/:id', async (req, res, next) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      const deleted = await repo.delete(tenantId, req.params.id);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Category not found' });
      }
      // Audit: category delete
      try {
        await logsRepo.create(tenantId, {
          userId: (req as any).userId || null,
          action: 'DELETE',
          resource: 'category',
          resourceId: req.params.id,
          details: `Deleted category ${req.params.id}`,
          request: { params: req.params },
          response: { id: req.params.id },
        });
      } catch {}
      res.status(204).send();
    } catch (e) { 
      console.error('Error in DELETE categories route:', {
        error: e,
        stack: e instanceof Error ? e.stack : undefined,
        tenantId: req.header('X-Tenant-ID'),
        categoryId: req.params.id,
        method: req.method,
        url: req.url
      });
      next(e); 
    }
  });

  return router;
}
