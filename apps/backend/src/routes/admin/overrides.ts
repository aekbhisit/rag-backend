import { Router } from 'express';
import { Pool } from 'pg';

export function buildOverridesRouter(pool: Pool): Router {
  const router = Router();
  
  // Placeholder routes
  router.get('/', (req, res) => {
    res.json({ message: 'Overrides endpoint' });
  });
  
  return router;
}