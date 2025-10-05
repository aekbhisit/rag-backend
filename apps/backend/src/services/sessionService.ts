import { v4 as uuidv4 } from 'uuid';
import { Redis } from 'ioredis';
import { getPostgresPool } from '../adapters/db/postgresClient';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

export interface SessionData {
  id: string;
  userId: string;
  tenantId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export class SessionService {
  private static instance: SessionService;
  private sessionPrefix = 'session:';
  private sessionExpiry = 24 * 60 * 60; // 24 hours in seconds

  static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  async createSession(
    userId: string,
    tenantId: string,
    ipAddress: string,
    userAgent: string,
    metadata?: Record<string, any>
  ): Promise<SessionData> {
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionExpiry * 1000);

    const sessionData: SessionData = {
      id: sessionId,
      userId,
      tenantId,
      ipAddress,
      userAgent,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt,
      isActive: true,
      metadata,
    };

    // Store in Redis
    await redis.setex(
      this.sessionPrefix + sessionId,
      this.sessionExpiry,
      JSON.stringify(sessionData)
    );

    // Store in database
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO user_sessions (id, user_id, tenant_id, ip_address, user_agent, created_at, last_accessed_at, expires_at, is_active, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        sessionId,
        userId,
        tenantId,
        ipAddress,
        userAgent,
        now,
        now,
        expiresAt,
        true,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );

    return sessionData;
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    // Try Redis first
    const cached = await redis.get(this.sessionPrefix + sessionId);
    if (cached) {
      const sessionData = JSON.parse(cached);
      // Update last accessed time
      await this.updateLastAccessed(sessionId);
      return sessionData;
    }

    // Fallback to database
    const pool = getPostgresPool();
    const result = await pool.query(
      'SELECT * FROM user_sessions WHERE id = $1 AND is_active = true AND expires_at > NOW()',
      [sessionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const sessionData = result.rows[0];
    sessionData.metadata = sessionData.metadata ? JSON.parse(sessionData.metadata) : undefined;

    // Cache in Redis
    await redis.setex(
      this.sessionPrefix + sessionId,
      this.sessionExpiry,
      JSON.stringify(sessionData)
    );

    return sessionData;
  }

  async updateLastAccessed(sessionId: string): Promise<void> {
    const now = new Date();
    
    // Update Redis
    const cached = await redis.get(this.sessionPrefix + sessionId);
    if (cached) {
      const sessionData = JSON.parse(cached);
      sessionData.lastAccessedAt = now;
      await redis.setex(
        this.sessionPrefix + sessionId,
        this.sessionExpiry,
        JSON.stringify(sessionData)
      );
    }

    // Update database
    const pool = getPostgresPool();
    await pool.query(
      'UPDATE user_sessions SET last_accessed_at = $1 WHERE id = $2',
      [now, sessionId]
    );
  }

  async invalidateSession(sessionId: string): Promise<void> {
    // Remove from Redis
    await redis.del(this.sessionPrefix + sessionId);

    // Mark as inactive in database
    const pool = getPostgresPool();
    await pool.query(
      'UPDATE user_sessions SET is_active = false WHERE id = $1',
      [sessionId]
    );
  }

  async invalidateUserSessions(userId: string, tenantId: string): Promise<void> {
    // Get all active sessions for user
    const pool = getPostgresPool();
    const result = await pool.query(
      'SELECT id FROM user_sessions WHERE user_id = $1 AND tenant_id = $2 AND is_active = true',
      [userId, tenantId]
    );

    // Invalidate each session
    for (const row of result.rows) {
      await this.invalidateSession(row.id);
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    // Clean up Redis
    const keys = await redis.keys(this.sessionPrefix + '*');
    for (const key of keys) {
      const cached = await redis.get(key);
      if (cached) {
        const sessionData = JSON.parse(cached);
        if (new Date(sessionData.expiresAt) < new Date()) {
          await redis.del(key);
        }
      }
    }

    // Clean up database
    const pool = getPostgresPool();
    await pool.query(
      'UPDATE user_sessions SET is_active = false WHERE expires_at < NOW() AND is_active = true'
    );
  }

  async getActiveSessionsForUser(userId: string, tenantId: string): Promise<SessionData[]> {
    const pool = getPostgresPool();
    const result = await pool.query(
      `SELECT * FROM user_sessions 
       WHERE user_id = $1 AND tenant_id = $2 AND is_active = true AND expires_at > NOW()
       ORDER BY last_accessed_at DESC`,
      [userId, tenantId]
    );

    return result.rows.map(row => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }
}

export const sessionService = SessionService.getInstance();
