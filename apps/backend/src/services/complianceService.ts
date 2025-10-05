import { getPostgresPool } from '../adapters/db/postgresClient';

interface ComplianceReport {
  reportId: string;
  tenantId: string;
  generatedAt: string;
  period: { start: string; end: string };
  summary: { totalRequests: number; totalErrors: number; totalSecurityEvents: number; averageResponseTime: number };
  securityMetrics: { authFailures: number; rateLimitHits: number; suspiciousActivities: number; serverErrors: number };
  dataAccess: { adminAccess: number; userAccess: number; publicAccess: number };
}

export class ComplianceService {
  async generateSecurityReport(tenantId: string, startDate: string, endDate: string): Promise<ComplianceReport> {
    const pool = getPostgresPool();

    const auditQuery = `
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN response_status >= 400 THEN 1 END) as total_errors,
        AVG(response_time) as avg_response_time,
        COUNT(CASE WHEN endpoint LIKE '/admin/%' THEN 1 END) as admin_access,
        COUNT(CASE WHEN endpoint LIKE '/users/%' THEN 1 END) as user_access,
        COUNT(CASE WHEN endpoint NOT LIKE '/admin/%' AND endpoint NOT LIKE '/users/%' THEN 1 END) as public_access
      FROM audit_logs 
      WHERE tenant_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
    `;

    const auditResult = await pool.query(auditQuery, [tenantId, startDate, endDate]);
    const auditData = auditResult.rows[0] || {};

    const errorQuery = `
      SELECT 
        COUNT(CASE WHEN error_code = 'VALIDATION_ERROR' THEN 1 END) as validation_errors,
        COUNT(CASE WHEN error_code = 'INTERNAL_ERROR' THEN 1 END) as server_errors,
        COUNT(CASE WHEN http_status >= 500 THEN 1 END) as http_5xx_errors
      FROM error_logs 
      WHERE tenant_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
    `;

    const errorResult = await pool.query(errorQuery, [tenantId, startDate, endDate]);
    const errorData = errorResult.rows[0] || {};

    const report: ComplianceReport = {
      reportId: `security-report-${Date.now()}`,
      tenantId,
      generatedAt: new Date().toISOString(),
      period: { start: startDate, end: endDate },
      summary: {
        totalRequests: parseInt(auditData.total_requests) || 0,
        totalErrors: parseInt(auditData.total_errors) || 0,
        totalSecurityEvents: (parseInt(errorData.validation_errors) || 0) + (parseInt(errorData.server_errors) || 0),
        averageResponseTime: parseFloat(auditData.avg_response_time) || 0,
      },
      securityMetrics: {
        authFailures: 0,
        rateLimitHits: 0,
        suspiciousActivities: parseInt(errorData.validation_errors) || 0,
        serverErrors: parseInt(errorData.server_errors) || 0,
      },
      dataAccess: {
        adminAccess: parseInt(auditData.admin_access) || 0,
        userAccess: parseInt(auditData.user_access) || 0,
        publicAccess: parseInt(auditData.public_access) || 0,
      },
    };

    return report;
  }

  async generateDataRetentionReport(tenantId: string): Promise<{ tableName: string; recordCount: number; oldestRecord: string; newestRecord: string; estimatedSize: string; }[]> {
    const pool = getPostgresPool();
    const tables = ['audit_logs', 'error_logs', 'users', 'contexts', 'messages'];
    const reports: Array<{ tableName: string; recordCount: number; oldestRecord: string; newestRecord: string; estimatedSize: string; }> = [];

    for (const table of tables) {
      try {
        const query = `
          SELECT 
            COUNT(*) as record_count,
            MIN(created_at) as oldest_record,
            MAX(created_at) as newest_record
          FROM ${table} 
          WHERE tenant_id = $1
        `;
        const result = await pool.query(query, [tenantId]);
        const data = result.rows[0] || {};
        reports.push({
          tableName: table,
          recordCount: parseInt(data.record_count) || 0,
          oldestRecord: data.oldest_record || 'N/A',
          newestRecord: data.newest_record || 'N/A',
          estimatedSize: `${(((parseInt(data.record_count) || 0) * 0.5)).toFixed(2)} KB`,
        });
      } catch {
        // Table might not exist; skip
      }
    }
    return reports;
  }

  async cleanupOldData(tenantId: string, retentionDays: number = 90): Promise<{ tableName: string; deletedRecords: number; }[]> {
    const pool = getPostgresPool();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const tables = ['audit_logs', 'error_logs'];
    const results: Array<{ tableName: string; deletedRecords: number; }> = [];
    for (const table of tables) {
      try {
        const deleteQuery = `
          DELETE FROM ${table} 
          WHERE tenant_id = $1 
            AND created_at < $2
        `;
        const result = await pool.query(deleteQuery, [tenantId, cutoffDate.toISOString()]);
        results.push({ tableName: table, deletedRecords: result.rowCount || 0 });
      } catch {
        results.push({ tableName: table, deletedRecords: 0 });
      }
    }
    return results;
  }
}

export const complianceService = new ComplianceService();


