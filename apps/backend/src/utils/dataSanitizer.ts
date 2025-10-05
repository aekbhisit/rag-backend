interface SanitizationRule {
  field: string | RegExp;
  replacement: string | ((value: any) => string);
  condition?: (value: any, context: any) => boolean;
}

const defaultSanitizationRules: SanitizationRule[] = [
  {
    field: /password|secret|token|key|auth/i,
    replacement: '[REDACTED]',
  },
  {
    field: 'email',
    replacement: (email: string) => {
      if (!email || typeof email !== 'string') return email;
      const [local, domain] = email.split('@');
      if (!domain) return email;
      return `${local.substring(0, 2)}***@${domain}`;
    },
  },
  {
    field: 'phone',
    replacement: (phone: string) => {
      if (!phone || typeof phone !== 'string') return phone;
      return phone.replace(/\d(?=\d{4})/g, '*');
    },
  },
  // Note: We intentionally do NOT redact generic "id" fields to avoid breaking UUIDs in responses
];

export class DataSanitizer {
  private rules: SanitizationRule[];

  constructor(rules: SanitizationRule[] = defaultSanitizationRules) {
    this.rules = rules;
  }

  sanitizeObject(obj: any, context: any = {}): any {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, context));
    }

    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      let sanitizedValue = value;
      
      for (const rule of this.rules) {
        if (this.shouldApplyRule(key, rule, value, context)) {
          if (typeof rule.replacement === 'function') {
            sanitizedValue = rule.replacement(value);
          } else {
            sanitizedValue = rule.replacement;
          }
          break; // Apply first matching rule
        }
      }
      
      if (typeof sanitizedValue === 'object' && sanitizedValue !== null) {
        sanitizedValue = this.sanitizeObject(sanitizedValue, context);
      }
      
      sanitized[key] = sanitizedValue;
    }
    
    return sanitized;
  }

  private shouldApplyRule(field: string, rule: SanitizationRule, value: any, context: any): boolean {
    // Check field match
    const fieldMatches = typeof rule.field === 'string' 
      ? field === rule.field 
      : rule.field.test(field);
    
    if (!fieldMatches) return false;
    
    // Check condition if provided
    if (rule.condition) {
      return rule.condition(value, context);
    }
    
    return true;
  }
}

export const dataSanitizer = new DataSanitizer();
