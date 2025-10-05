interface SystemSecurityEvent {
  eventId: string;
  type: 'cross_app_access' | 'tenant_violation' | 'rate_limit_breach' | 'security_header_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  sourceApp: string;
  tenantId: string;
  details: Record<string, any>;
  timestamp: string;
}

export class SystemSecurityMonitor {
  private events: SystemSecurityEvent[] = [];
  private readonly maxEvents = 2000;

  logSystemSecurityEvent(event: Omit<SystemSecurityEvent, 'eventId' | 'timestamp'>): void {
    const fullEvent: SystemSecurityEvent = {
      ...event,
      eventId: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    this.events.push(fullEvent);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log to console with appropriate level
    const logLevel = event.severity === 'critical' ? 'error' : 
                    event.severity === 'high' ? 'warn' : 'info';
    console[logLevel](`[SYSTEM SECURITY] ${event.type.toUpperCase()}: ${event.sourceApp}`, event.details);

    // Alert on critical events
    if (event.severity === 'critical') {
      this.handleCriticalEvent(fullEvent);
    }
  }

  private handleCriticalEvent(event: SystemSecurityEvent): void {
    console.error(`[CRITICAL SECURITY ALERT] ${event.type}`, {
      eventId: event.eventId,
      sourceApp: event.sourceApp,
      tenantId: event.tenantId,
      details: event.details,
      timestamp: event.timestamp
    });
    
    // Here you would integrate with external alerting systems
    // e.g., Slack, PagerDuty, email notifications
  }

  getSystemSecurityMetrics(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    eventsBySourceApp: Record<string, number>;
    recentCriticalEvents: SystemSecurityEvent[];
  } {
    const eventsByType = this.events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventsBySeverity = this.events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventsBySourceApp = this.events.reduce((acc, event) => {
      acc[event.sourceApp] = (acc[event.sourceApp] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentCriticalEvents = this.events
      .filter(event => event.severity === 'critical')
      .slice(-10);

    return {
      totalEvents: this.events.length,
      eventsByType,
      eventsBySeverity,
      eventsBySourceApp,
      recentCriticalEvents
    };
  }

  getEventsBySourceApp(sourceApp: string): SystemSecurityEvent[] {
    return this.events.filter(event => event.sourceApp === sourceApp);
  }

  getEventsByTenant(tenantId: string): SystemSecurityEvent[] {
    return this.events.filter(event => event.tenantId === tenantId);
  }
}

export const systemSecurityMonitor = new SystemSecurityMonitor();
