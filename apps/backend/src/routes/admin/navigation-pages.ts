import { Router } from 'express';
import { Pool } from 'pg';
import { z } from 'zod';

export function buildNavigationPagesRouter(pool: Pool) {
  const router = Router();

// Validation schemas
const createNavigationPageSchema = z.object({
  agent_key: z.string().min(1),
  page_slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  examples: z.array(z.string()).optional(),
  priority: z.number().min(0).max(1).optional(),
  is_active: z.boolean().optional(),
});

const updateNavigationPageSchema = createNavigationPageSchema.partial().omit({ agent_key: true, page_slug: true });

// GET /api/admin/navigation-pages/:agentKey - Get all navigation pages for an agent
router.get('/:agentKey', async (req, res) => {
  try {
    const { agentKey } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM agent_navigation_pages WHERE agent_key = $1 ORDER BY priority DESC, title ASC',
      [agentKey]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching navigation pages:', error);
    res.status(500).json({ error: 'Failed to fetch navigation pages' });
  }
});

// POST /api/admin/navigation-pages - Create a new navigation page
router.post('/', async (req, res) => {
  try {
    const validatedData = createNavigationPageSchema.parse(req.body);
    
    const result = await pool.query(
      `INSERT INTO agent_navigation_pages 
       (agent_key, page_slug, title, description, keywords, examples, priority, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        validatedData.agent_key,
        validatedData.page_slug,
        validatedData.title,
        validatedData.description || null,
        validatedData.keywords || [],
        validatedData.examples || [],
        validatedData.priority || 0.5,
        validatedData.is_active !== undefined ? validatedData.is_active : true,
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'Navigation page with this agent_key and page_slug already exists' });
    }
    
    console.error('Error creating navigation page:', error);
    res.status(500).json({ error: 'Failed to create navigation page' });
  }
});

// PUT /api/admin/navigation-pages/:id - Update a navigation page
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateNavigationPageSchema.parse(req.body);
    
    const setClause = [];
    const values = [];
    let paramIndex = 1;
    
    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });
    
    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    setClause.push(`updated_at = NOW()`);
    values.push(id);
    
    const result = await pool.query(
      `UPDATE agent_navigation_pages 
       SET ${setClause.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Navigation page not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    
    console.error('Error updating navigation page:', error);
    res.status(500).json({ error: 'Failed to update navigation page' });
  }
});

// DELETE /api/admin/navigation-pages/:id - Delete a navigation page
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM agent_navigation_pages WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Navigation page not found' });
    }
    
    res.json({ message: 'Navigation page deleted successfully' });
  } catch (error) {
    console.error('Error deleting navigation page:', error);
    res.status(500).json({ error: 'Failed to delete navigation page' });
  }
});

// GET /api/admin/navigation-pages/:agentKey/active - Get active navigation pages for an agent (for system prompt)
router.get('/:agentKey/active', async (req, res) => {
  try {
    const { agentKey } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM agent_navigation_pages WHERE agent_key = $1 AND is_active = true ORDER BY priority DESC, title ASC',
      [agentKey]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching active navigation pages:', error);
    res.status(500).json({ error: 'Failed to fetch active navigation pages' });
  }
});

  return router;
}
