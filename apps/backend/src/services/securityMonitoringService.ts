interface SecurityEvent {
  type: 'auth_failure' | 'rate_limit' | 'suspicious_activity' | 'data_access' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metadata: Record<string, any>;
  timestamp: string;
  tenantId: string;
  userId?: string;
  ipAddress?: string;
}

export class SecurityMonitoringService {
  private events: SecurityEvent[] = [];
  private readonly maxEvents = 1000;

  logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.events.push(fullEvent);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    try {
      // eslint-disable-next-line no-console
      console.warn(`[SECURITY EVENT] ${event.severity.toUpperCase()}: ${event.message}`, event.metadata);
    } catch {}
  }

  getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.events.slice(-limit);
  }

  getEventsByType(type: SecurityEvent['type']): SecurityEvent[] {
    return this.events.filter(event => event.type === type);
  }

  getEventsBySeverity(severity: SecurityEvent['severity']): SecurityEvent[] {
    return this.events.filter(event => event.severity === severity);
  }

  checkForAlerts(): void {
    const recentCritical = this.getEventsBySeverity('critical').filter(
      event => Date.now() - new Date(event.timestamp).getTime() < 60000
    );
    if (recentCritical.length > 0) {
      try { console.error(`[SECURITY ALERT] ${recentCritical.length} critical events in the last minute`); } catch {}
    }
  }

  getSecurityMetrics(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    recentEvents: SecurityEvent[];
  } {
    const eventsByType = this.events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventsBySeverity = this.events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEvents: this.events.length,
      eventsByType,
      eventsBySeverity,
      recentEvents: this.getRecentEvents(50),
    };
  }
}

export const securityMonitoring = new SecurityMonitoringService();


