import { Router } from 'express';
import type { Pool } from 'pg';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import bcrypt from 'bcryptjs';
import { getTenantIdFromReq } from '../../config/tenant';
import { secrets } from '../../config/security/secrets';
import { tokenService } from '../../services/tokenService';
import { loginAttemptService } from '../../services/loginAttemptService';
import { sessionService } from '../../services/sessionService';
import { createSessionCookie, clearSessionCookie } from '../../middleware/sessionMiddleware';

export function buildAuthRouter(pool: Pool) {
  const router = Router();

  // Ensure required columns exist
  async function ensureUserColumns() {
    await pool.query(`
      ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS name text,
        ADD COLUMN IF NOT EXISTS status varchar NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS password_hash text;
    `);
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.constraint_column_usage
          WHERE table_name = 'users' AND constraint_name = 'users_status_chk'
        ) THEN
          ALTER TABLE public.users
            ADD CONSTRAINT users_status_chk CHECK (status IN ('active','inactive','pending'));
        END IF;
      END$$;
    `);
  }

  router.post('/login', async (req, res, next) => {
    try {
      const { email, password } = (req.body || {}) as { email?: string; password?: string };
      const tenantId = getTenantIdFromReq(req);
      if (!email || !password) return res.status(400).json({ message: 'Missing email or password' });
      
      // Check for account lockout (enhanced security)
      const identifier = `${req.ip}:${email}`;
      const isLocked = await loginAttemptService.isAccountLocked(identifier);
      
      if (isLocked) {
        return res.status(423).json({ 
          message: 'Account temporarily locked due to too many failed attempts',
          retryAfter: 900 // 15 minutes
        });
      }
      
      await ensureUserColumns();
      
      // First, try to find a user within the provided tenant
      const { rows } = await pool.query(`SELECT * FROM users WHERE tenant_id=$1 AND email=$2 LIMIT 1`, [tenantId, email]);
      let user = rows[0];

      // If not found in tenant, allow global admin to login regardless of tenant
      if (!user) {
        const anyRes = await pool.query(`SELECT * FROM users WHERE email=$1 LIMIT 1`, [email]);
        const anyUser = anyRes.rows[0];
        if (anyUser && anyUser.role === 'admin') {
          user = anyUser;
        }
      }

      if (!user) {
        // Record failed attempt
        await loginAttemptService.recordFailedAttempt(identifier);
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      if (user.status && user.status !== 'active') return res.status(403).json({ message: 'User is not active' });
      
      const ok = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
      if (!ok) {
        // Record failed attempt
        await loginAttemptService.recordFailedAttempt(identifier);
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Record successful attempt
      await loginAttemptService.recordSuccessfulAttempt(identifier);

      // Generate JWT token
      const token = tokenService.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
      });

      // Create session for enhanced security
      const session = await sessionService.createSession(
        user.id,
        user.tenant_id,
        req.ip || 'unknown',
        req.get('User-Agent') || 'unknown',
        {
          role: user.role,
          email: user.email,
          loginTime: new Date().toISOString(),
        }
      );

      // Set session cookie
      createSessionCookie(session.id, res);

      // Enhanced response with JWT token and session
      return res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          role: user.role, 
          status: user.status 
        },
        token,
        session: {
          id: session.id,
          expiresAt: session.expiresAt
        }
      });
    } catch (e) { 
      // Record failed attempt on error
      const { email } = (req.body || {}) as { email?: string; password?: string };
      if (email) {
        const identifier = `${req.ip}:${email}`;
        await loginAttemptService.recordFailedAttempt(identifier);
      }
      next(e); 
    }
  });

  router.post('/set-password', async (req, res, next) => {
    try {
      const { email, password } = (req.body || {}) as { email?: string; password?: string };
      const tenantId = getTenantIdFromReq(req);
      if (!email || !password) return res.status(400).json({ message: 'Missing email or password' });
      await ensureUserColumns();
      const hash = await bcrypt.hash(password, 10);
      const { rows } = await pool.query(
        `UPDATE users
         SET password_hash=$3, status=COALESCE(status,'active')
         WHERE tenant_id=$1 AND email=$2
         RETURNING id`,
        [tenantId, email, hash]
      );
      // If not found within tenant, allow updating global admin across tenants
      if (!rows[0]) {
        const anyUserRes = await pool.query(`SELECT id, role FROM users WHERE email=$1 LIMIT 1`, [email]);
        const anyUser = anyUserRes.rows[0];
        if (anyUser && anyUser.role === 'admin') {
          const upd = await pool.query(
            `UPDATE users SET password_hash=$2, status=COALESCE(status,'active') WHERE email=$1 RETURNING id`,
            [email, hash]
          );
          if (!upd.rows[0]) return res.status(404).json({ message: 'User not found' });
          return res.json({ message: 'Password updated' });
        }
        return res.status(404).json({ message: 'User not found' });
      }
      return res.json({ message: 'Password updated' });
    } catch (e) { next(e); }
  });

  router.post('/logout', async (req, res, next) => {
    try {
      // Extract session ID from request
      const sessionId = req.headers.authorization?.replace('Bearer ', '') || 
                       req.cookies?.sessionId || 
                       req.query.sessionId;

      if (sessionId) {
        // Invalidate session
        await sessionService.invalidateSession(sessionId);
      }

      // Clear session cookie
      clearSessionCookie(res);

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  });

  return router;
}


