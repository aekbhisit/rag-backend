interface ApplicationConfig {
  appId: string;
  name: string;
  domain: string;
  allowedOrigins: string[];
  allowedOperations: string[];
  rateLimitConfig: {
    windowMs: number;
    maxRequests: number;
  };
  securityLevel: 'high' | 'medium' | 'low';
}

export class ApplicationRegistry {
  private applications: Map<string, ApplicationConfig> = new Map();

  constructor() {
    this.initializeApplications();
  }

  private initializeApplications() {
    // Travel AI Bot configuration
    this.applications.set('travel-ai-bot', {
      appId: 'travel-ai-bot',
      name: 'Travel AI Bot',
      domain: 'chat.haahii.com',
      allowedOrigins: ['https://chat.haahii.com', 'http://localhost:3200'],
      allowedOperations: ['read', 'create_session', 'log_message', 'retrieve_context', 'public_chat'],
      rateLimitConfig: { windowMs: 60000, maxRequests: 1000 },
      securityLevel: 'medium'
    });

    // Admin Web configuration
    this.applications.set('admin-web', {
      appId: 'admin-web',
      name: 'Admin Web Interface',
      domain: 'admin.haahii.com',
      allowedOrigins: ['https://admin.haahii.com', 'http://localhost:3000'],
      allowedOperations: ['admin_all'],
      rateLimitConfig: { windowMs: 60000, maxRequests: 5000 },
      securityLevel: 'high'
    });

    // Development environment
    this.applications.set('development', {
      appId: 'development',
      name: 'Development Environment',
      domain: 'localhost',
      allowedOrigins: ['http://localhost:3000', 'http://localhost:3100', 'http://localhost:3200'],
      allowedOperations: ['dev_all'],
      rateLimitConfig: { windowMs: 60000, maxRequests: 10000 },
      securityLevel: 'low'
    });
  }

  getApplication(appId: string): ApplicationConfig | null {
    return this.applications.get(appId) || null;
  }

  getApplicationByOrigin(origin: string): ApplicationConfig | null {
    for (const app of this.applications.values()) {
      if (app.allowedOrigins.includes(origin)) {
        return app;
      }
    }
    return null;
  }

  validateOrigin(origin: string): boolean {
    return this.getApplicationByOrigin(origin) !== null;
  }

  getAllowedOperations(origin: string): string[] {
    const app = this.getApplicationByOrigin(origin);
    return app ? app.allowedOperations : ['public_only'];
  }

  getSecurityLevel(origin: string): 'high' | 'medium' | 'low' {
    const app = this.getApplicationByOrigin(origin);
    return app ? app.securityLevel : 'low';
  }

  // Expose applications map for admin dashboard
  getApplications(): ApplicationConfig[] {
    return Array.from(this.applications.values());
  }
}

export const applicationRegistry = new ApplicationRegistry();
