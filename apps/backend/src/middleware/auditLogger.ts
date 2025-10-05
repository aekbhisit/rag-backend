import { Request, Response, NextFunction } from 'express';
import { getPostgresPool } from '../adapters/db/postgresClient';

interface AuditLog {
  tenant_id: string;
  user_id?: string;
  endpoint: string;
  method: string;
  ip_address: string;
  user_agent?: string;
  request_size?: number;
  response_status: number;
  response_time: number;
  timestamp: string;
}

export function auditLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const tenantId = req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000';
  const userId = (req as any).user?.userId;
  
  // Capture response details
  const originalSend = res.send;
  const originalJson = res.json;
  
  let responseSize = 0;
  let responseBody: any;
  
  res.send = function(body) {
    responseSize = Buffer.byteLength(body || '', 'utf8');
    responseBody = body;
    return originalSend.call(this, body);
  };
  
  res.json = function(body) {
    responseSize = Buffer.byteLength(JSON.stringify(body || {}), 'utf8');
    responseBody = body;
    return originalJson.call(this, body);
  };
  
  // Log after response
  res.on('finish', async () => {
    try {
      const responseTime = Date.now() - startTime;
      
      const auditLog: AuditLog = {
        tenant_id: tenantId,
        user_id: userId,
        endpoint: req.originalUrl || req.url,
        method: req.method,
        ip_address: req.ip || 'unknown',
        user_agent: req.get('User-Agent'),
        request_size: req.get('Content-Length') ? parseInt(req.get('Content-Length')!) : undefined,
        response_status: res.statusCode,
        response_time: responseTime,
        timestamp: new Date().toISOString(),
      };
      
      // Log to database asynchronously (don't block response)
      logAuditEntry(auditLog).catch(error => {
        console.error('Failed to log audit entry:', error);
      });
      
    } catch (error) {
      console.error('Audit logging error:', error);
    }
  });
  
  next();
}

async function logAuditEntry(auditLog: AuditLog) {
  try {
    const pool = getPostgresPool();
    await pool.query(`
      INSERT INTO audit_logs (tenant_id, user_id, endpoint, method, ip_address, user_agent, request_size, response_status, response_time, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      auditLog.tenant_id,
      auditLog.user_id,
      auditLog.endpoint,
      auditLog.method,
      auditLog.ip_address,
      auditLog.user_agent,
      auditLog.request_size,
      auditLog.response_status,
      auditLog.response_time,
      auditLog.timestamp,
    ]);
  } catch (error) {
    console.error('Database audit logging failed:', error);
  }
}
