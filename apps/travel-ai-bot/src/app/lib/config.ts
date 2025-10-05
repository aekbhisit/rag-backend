import { useState, useEffect, useCallback } from 'react';

export interface MultiChannelConfig {
  // Core System Configuration
  system: {
    defaultChannel: 'auto' | 'normal' | 'realtime' | 'human';
    autoRoutingEnabled: boolean;
    sessionTimeout: number;
    maxConcurrentSessions: number;
    enableHealthChecks: boolean;
    healthCheckInterval: number;
  };

  // Channel-specific Configuration
  channels: {
    normal: {
      enabled: boolean;
      model: string;
      maxTokens: number;
      temperature: number;
      responseTimeout: number;
      rateLimitRpm: number;
    };
    realtime: {
      enabled: boolean;
      model: string;
      codec: 'opus' | 'g711_ulaw' | 'g711_alaw';
      voiceActivity: boolean;
      turnDetection: boolean;
      responseTimeout: number;
      maxSessionDuration: number;
    };
    human: {
      enabled: boolean;
      maxStaffLoad: number;
      assignmentTimeout: number;
      autoAssignment: boolean;
      requiresConfirmation: boolean;
      offlineMessage: string;
    };
  };

  // UI Configuration
  ui: {
    theme: 'light' | 'dark' | 'auto';
    primaryColor: string;
    accentColor: string;
    enableAnimations: boolean;
    showDebugInfo: boolean;
    language: string;
    timeFormat: '12h' | '24h';
    dateFormat: string;
  };

  // Features Configuration
  features: {
    voiceToText: boolean;
    textToSpeech: boolean;
    screenReader: boolean;
    pushToTalk: boolean;
    continuousConversation: boolean;
    messageHistory: boolean;
    exportTranscripts: boolean;
    analytics: boolean;
    staffAssignment: boolean;
    channelSwitchNotifications: boolean;
  };

  // Notification Configuration
  notifications: {
    channels: {
      browser: boolean;
      email: boolean;
      sms: boolean;
    };
    events: {
      channelSwitch: boolean;
      staffAssignment: boolean;
      systemErrors: boolean;
      connectionIssues: boolean;
      messageReceived: boolean;
    };
    settings: {
      sound: boolean;
      vibration: boolean;
      autoHide: boolean;
      autoHideDelay: number;
    };
  };

  // Analytics Configuration
  analytics: {
    enabled: boolean;
    trackingId?: string;
    collectPersonalData: boolean;
    retentionDays: number;
    enableRealtime: boolean;
    customEvents: boolean;
  };

  // Security Configuration
  security: {
    enableRateLimit: boolean;
    maxRequestsPerMinute: number;
    enableCORS: boolean;
    allowedOrigins: string[];
    enableAuth: boolean;
    sessionDuration: number;
    requireHttps: boolean;
  };

  // Performance Configuration
  performance: {
    enableCaching: boolean;
    cacheTimeout: number;
    enableCompression: boolean;
    maxMemoryUsage: number;
    enableLazyLoading: boolean;
    prefetchEnabled: boolean;
  };

  // Accessibility Configuration
  accessibility: {
    highContrast: boolean;
    largeText: boolean;
    reduceMotion: boolean;
    keyboardNavigation: boolean;
    screenReaderOptimized: boolean;
    focusIndicators: boolean;
  };

  // Development Configuration
  development: {
    enableDevMode: boolean;
    showPerformanceMetrics: boolean;
    enableHotReload: boolean;
    verboseLogging: boolean;
    mockServices: boolean;
    bypassAuth: boolean;
  };
}

// Environment-specific configuration
export const environmentConfigs: Record<string, Partial<MultiChannelConfig>> = {
  development: {
    system: {
      defaultChannel: 'auto',
      autoRoutingEnabled: true,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      maxConcurrentSessions: 10,
      enableHealthChecks: true,
      healthCheckInterval: 30000, // 30 seconds
    },
    channels: {
      normal: {
        enabled: true,
        model: 'gpt-4o-mini',
        maxTokens: 2048,
        temperature: 0.7,
        responseTimeout: 30000,
        rateLimitRpm: 60,
      },
      realtime: {
        enabled: true,
        model: 'gpt-4o-realtime-preview-2024-12-17',
        codec: 'opus',
        voiceActivity: true,
        turnDetection: true,
        responseTimeout: 15000,
        maxSessionDuration: 60 * 60 * 1000, // 1 hour
      },
      human: {
        enabled: true,
        maxStaffLoad: 3,
        assignmentTimeout: 60000, // 1 minute
        autoAssignment: true,
        requiresConfirmation: false,
        offlineMessage: 'Our staff is currently offline. Please try again later or use our AI assistant.',
      },
    },
    ui: {
      theme: 'light',
      primaryColor: '#3b82f6',
      accentColor: '#10b981',
      enableAnimations: true,
      showDebugInfo: true,
      language: 'en-US',
      timeFormat: '24h',
      dateFormat: 'yyyy-MM-dd',
    },
    features: {
      voiceToText: true,
      textToSpeech: true,
      screenReader: true,
      pushToTalk: true,
      continuousConversation: true,
      messageHistory: true,
      exportTranscripts: true,
      analytics: true,
      staffAssignment: true,
      channelSwitchNotifications: true,
    },
    development: {
      enableDevMode: true,
      showPerformanceMetrics: true,
      enableHotReload: true,
      verboseLogging: true,
      mockServices: false,
      bypassAuth: true,
    },
  },
  production: {
    system: {
      defaultChannel: 'auto',
      autoRoutingEnabled: true,
      sessionTimeout: 60 * 60 * 1000, // 1 hour
      maxConcurrentSessions: 1000,
      enableHealthChecks: true,
      healthCheckInterval: 60000, // 1 minute
    },
    channels: {
      normal: {
        enabled: true,
        model: 'gpt-4o-mini',
        maxTokens: 4096,
        temperature: 0.7,
        responseTimeout: 45000,
        rateLimitRpm: 300,
      },
      realtime: {
        enabled: true,
        model: 'gpt-4o-realtime-preview-2024-12-17',
        codec: 'opus',
        voiceActivity: true,
        turnDetection: true,
        responseTimeout: 20000,
        maxSessionDuration: 2 * 60 * 60 * 1000, // 2 hours
      },
      human: {
        enabled: true,
        maxStaffLoad: 5,
        assignmentTimeout: 30000, // 30 seconds
        autoAssignment: true,
        requiresConfirmation: true,
        offlineMessage: 'Our support team is currently at capacity. Please try again in a few minutes.',
      },
    },
    ui: {
      theme: 'light',
      primaryColor: '#3b82f6',
      accentColor: '#10b981',
      enableAnimations: true,
      showDebugInfo: false,
      language: 'en-US',
      timeFormat: '12h',
      dateFormat: 'MM/dd/yyyy',
    },
    features: {
      voiceToText: true,
      textToSpeech: true,
      screenReader: true,
      pushToTalk: true,
      continuousConversation: true,
      messageHistory: true,
      exportTranscripts: true,
      analytics: true,
      staffAssignment: true,
      channelSwitchNotifications: true,
    },
    development: {
      enableDevMode: false,
      showPerformanceMetrics: false,
      enableHotReload: false,
      verboseLogging: false,
      mockServices: false,
      bypassAuth: false,
    },
    security: {
      enableRateLimit: true,
      maxRequestsPerMinute: 100,
      enableCORS: true,
      allowedOrigins: [],
      enableAuth: true,
      sessionDuration: 24 * 60 * 60 * 1000, // 24 hours
      requireHttps: true,
    },
  },
  testing: {
    system: {
      defaultChannel: 'normal',
      autoRoutingEnabled: false,
      sessionTimeout: 10 * 60 * 1000, // 10 minutes
      maxConcurrentSessions: 5,
      enableHealthChecks: false,
      healthCheckInterval: 10000, // 10 seconds
    },
    channels: {
      normal: {
        enabled: true,
        model: 'gpt-4o-mini',
        maxTokens: 1024,
        temperature: 0.5,
        responseTimeout: 15000,
        rateLimitRpm: 30,
      },
      realtime: {
        enabled: false,
        model: 'gpt-4o-realtime-preview-2024-12-17',
        codec: 'opus',
        voiceActivity: false,
        turnDetection: false,
        responseTimeout: 10000,
        maxSessionDuration: 30 * 60 * 1000, // 30 minutes
      },
      human: {
        enabled: false,
        maxStaffLoad: 1,
        assignmentTimeout: 15000, // 15 seconds
        autoAssignment: false,
        requiresConfirmation: false,
        offlineMessage: 'Human support is disabled in testing mode.',
      },
    },
    development: {
      enableDevMode: true,
      showPerformanceMetrics: true,
      enableHotReload: true,
      verboseLogging: true,
      mockServices: true,
      bypassAuth: true,
    },
  },
};

// Default configuration that combines all defaults
export const defaultConfig: MultiChannelConfig = {
  system: {
    defaultChannel: 'auto',
    autoRoutingEnabled: true,
    sessionTimeout: 30 * 60 * 1000,
    maxConcurrentSessions: 100,
    enableHealthChecks: true,
    healthCheckInterval: 30000,
  },
  channels: {
    normal: {
      enabled: true,
      model: 'gpt-4o-mini',
      maxTokens: 2048,
      temperature: 0.7,
      responseTimeout: 30000,
      rateLimitRpm: 60,
    },
    realtime: {
      enabled: true,
      model: 'gpt-4o-realtime-preview-2024-12-17',
      codec: 'opus',
      voiceActivity: true,
      turnDetection: true,
      responseTimeout: 15000,
      maxSessionDuration: 60 * 60 * 1000,
    },
    human: {
      enabled: true,
      maxStaffLoad: 3,
      assignmentTimeout: 60000,
      autoAssignment: true,
      requiresConfirmation: false,
      offlineMessage: 'Our staff is currently offline. Please try again later.',
    },
  },
  ui: {
    theme: 'light',
    primaryColor: '#3b82f6',
    accentColor: '#10b981',
    enableAnimations: true,
    showDebugInfo: false,
    language: 'en-US',
    timeFormat: '12h',
    dateFormat: 'MM/dd/yyyy',
  },
  features: {
    voiceToText: true,
    textToSpeech: true,
    screenReader: true,
    pushToTalk: true,
    continuousConversation: true,
    messageHistory: true,
    exportTranscripts: true,
    analytics: true,
    staffAssignment: true,
    channelSwitchNotifications: true,
  },
  notifications: {
    channels: {
      browser: true,
      email: false,
      sms: false,
    },
    events: {
      channelSwitch: true,
      staffAssignment: true,
      systemErrors: true,
      connectionIssues: true,
      messageReceived: false,
    },
    settings: {
      sound: true,
      vibration: false,
      autoHide: true,
      autoHideDelay: 8000,
    },
  },
  analytics: {
    enabled: true,
    collectPersonalData: false,
    retentionDays: 30,
    enableRealtime: true,
    customEvents: true,
  },
  security: {
    enableRateLimit: true,
    maxRequestsPerMinute: 60,
    enableCORS: true,
    allowedOrigins: ['http://localhost:3000'],
    enableAuth: false,
    sessionDuration: 24 * 60 * 60 * 1000,
    requireHttps: false,
  },
  performance: {
    enableCaching: true,
    cacheTimeout: 300000, // 5 minutes
    enableCompression: true,
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    enableLazyLoading: true,
    prefetchEnabled: true,
  },
  accessibility: {
    highContrast: false,
    largeText: false,
    reduceMotion: false,
    keyboardNavigation: true,
    screenReaderOptimized: false,
    focusIndicators: true,
  },
  development: {
    enableDevMode: false,
    showPerformanceMetrics: false,
    enableHotReload: false,
    verboseLogging: false,
    mockServices: false,
    bypassAuth: false,
  },
};

// Deep merge utility for configuration objects
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] !== undefined) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || ({} as T[typeof key]), source[key] as any);
      } else {
        result[key] = source[key] as any;
      }
    }
  }
  
  return result;
}

// Configuration manager class
export class ConfigManager {
  private static instance: ConfigManager;
  private config: MultiChannelConfig;
  private listeners: ((config: MultiChannelConfig) => void)[] = [];

  private constructor() {
    // Initialize with default configuration
    this.config = { ...defaultConfig };
    this.loadConfiguration();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfiguration(): void {
    try {
      // Load from environment variables
      const environment = process.env.NODE_ENV || 'development';
      console.log(`[ConfigManager] Loading configuration for environment: ${environment}`);

      // Get environment-specific config
      const envConfig = environmentConfigs[environment] || {};
      
      // Merge with default configuration
      this.config = deepMerge(defaultConfig, envConfig);

      // Load user preferences from localStorage (client-side only)
      if (typeof window !== 'undefined') {
        try {
          const savedPrefs = localStorage.getItem('multiChannelConfig');
          if (savedPrefs) {
            const userConfig = JSON.parse(savedPrefs);
            this.config = deepMerge(this.config, userConfig);
            console.log('[ConfigManager] Loaded user preferences from localStorage');
          }
        } catch (error) {
          console.warn('[ConfigManager] Failed to load user preferences:', error);
        }
      }

      // Override with environment variables if available
      this.applyEnvironmentOverrides();

      console.log('[ConfigManager] Configuration loaded successfully');
    } catch (error) {
      console.error('[ConfigManager] Failed to load configuration:', error);
      // Fall back to default configuration
      this.config = { ...defaultConfig };
    }
  }

  private applyEnvironmentOverrides(): void {
    // Apply environment variable overrides - only on server side
    if (typeof window === 'undefined' && typeof process !== 'undefined' && process.env) {
      const env = process.env;

      // System overrides
      if (env.DEFAULT_CHANNEL) {
        this.config.system.defaultChannel = env.DEFAULT_CHANNEL as any;
      }
      if (env.AUTO_ROUTING_ENABLED) {
        this.config.system.autoRoutingEnabled = env.AUTO_ROUTING_ENABLED === 'true';
      }
      if (env.SESSION_TIMEOUT) {
        this.config.system.sessionTimeout = parseInt(env.SESSION_TIMEOUT, 10);
      }

      // Channel overrides
      if (env.OPENAI_MODEL) {
        this.config.channels.normal.model = env.OPENAI_MODEL;
        this.config.channels.realtime.model = env.OPENAI_MODEL;
      }
      if (env.MAX_TOKENS) {
        this.config.channels.normal.maxTokens = parseInt(env.MAX_TOKENS, 10);
      }
      if (env.TEMPERATURE) {
        this.config.channels.normal.temperature = parseFloat(env.TEMPERATURE);
      }

      // Feature overrides
      if (env.ANALYTICS_ENABLED) {
        this.config.analytics.enabled = env.ANALYTICS_ENABLED === 'true';
      }
      if (env.VOICE_ENABLED) {
        this.config.features.voiceToText = env.VOICE_ENABLED === 'true';
        this.config.features.textToSpeech = env.VOICE_ENABLED === 'true';
      }

      // Security overrides
      if (env.RATE_LIMIT_RPM) {
        this.config.security.maxRequestsPerMinute = parseInt(env.RATE_LIMIT_RPM, 10);
      }
      if (env.ALLOWED_ORIGINS) {
        this.config.security.allowedOrigins = env.ALLOWED_ORIGINS.split(',');
      }
    }
  }

  public getConfig(): MultiChannelConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<MultiChannelConfig>): void {
    this.config = deepMerge(this.config, updates);

    // Save to localStorage (client-side only)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('multiChannelConfig', JSON.stringify(updates));
        console.log('[ConfigManager] Saved configuration updates to localStorage');
      } catch (error) {
        console.warn('[ConfigManager] Failed to save configuration to localStorage:', error);
      }
    }

    // Notify listeners
    this.notifyListeners();
    console.log('[ConfigManager] Configuration updated');
  }

  public resetToDefaults(): void {
    this.config = { ...defaultConfig };
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('multiChannelConfig');
        console.log('[ConfigManager] Cleared configuration from localStorage');
      } catch (error) {
        console.warn('[ConfigManager] Failed to clear localStorage:', error);
      }
    }

    this.notifyListeners();
    console.log('[ConfigManager] Configuration reset to defaults');
  }

  public subscribe(listener: (config: MultiChannelConfig) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.config);
      } catch (error) {
        console.error('[ConfigManager] Error in configuration listener:', error);
      }
    });
  }

  // Utility methods for common configuration access
  public isFeatureEnabled(feature: keyof MultiChannelConfig['features']): boolean {
    return this.config.features[feature];
  }

  public getChannelConfig(channel: keyof MultiChannelConfig['channels']) {
    return this.config.channels[channel];
  }

  public getUIConfig() {
    return this.config.ui;
  }

  public getSecurityConfig() {
    return this.config.security;
  }

  public isDevelopmentMode(): boolean {
    return this.config.development.enableDevMode;
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();

// React hook for using configuration
export function useConfiguration() {
  const [config, setConfig] = useState<MultiChannelConfig>(configManager.getConfig());

  useEffect(() => {
    const unsubscribe = configManager.subscribe(setConfig);
    return unsubscribe;
  }, []);

  const updateConfig = useCallback((updates: Partial<MultiChannelConfig>) => {
    configManager.updateConfig(updates);
  }, []);

  const resetConfig = useCallback(() => {
    configManager.resetToDefaults();
  }, []);

  return {
    config,
    updateConfig,
    resetConfig,
    isFeatureEnabled: configManager.isFeatureEnabled.bind(configManager),
    getChannelConfig: configManager.getChannelConfig.bind(configManager),
    getUIConfig: configManager.getUIConfig.bind(configManager),
    isDevelopmentMode: configManager.isDevelopmentMode.bind(configManager),
  };
}

// Configuration validation
export function validateConfiguration(config: Partial<MultiChannelConfig>): string[] {
  const errors: string[] = [];

  // Validate system configuration
  if (config.system) {
    if (config.system.sessionTimeout && config.system.sessionTimeout < 60000) {
      errors.push('Session timeout must be at least 1 minute (60000ms)');
    }
    if (config.system.maxConcurrentSessions && config.system.maxConcurrentSessions < 1) {
      errors.push('Max concurrent sessions must be at least 1');
    }
  }

  // Validate channel configuration
  if (config.channels) {
    if (config.channels.normal?.maxTokens && config.channels.normal.maxTokens < 1) {
      errors.push('Normal channel max tokens must be at least 1');
    }
    if (config.channels.normal?.temperature && (config.channels.normal.temperature < 0 || config.channels.normal.temperature > 2)) {
      errors.push('Normal channel temperature must be between 0 and 2');
    }
    if (config.channels.human?.maxStaffLoad && config.channels.human.maxStaffLoad < 1) {
      errors.push('Human channel max staff load must be at least 1');
    }
  }

  return errors;
} 