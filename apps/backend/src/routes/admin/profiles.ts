import { Router } from 'express';
import { Pool } from 'pg';

export function buildProfilesRouter(pool: Pool): Router {
  const router = Router();
  
  // Placeholder routes
  router.get('/', (req, res) => {
    res.json({ message: 'Profiles endpoint' });
  });
  
  return router;
}