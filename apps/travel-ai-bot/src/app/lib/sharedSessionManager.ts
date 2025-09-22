/**
 * Shared Session Manager
 * Unified session ID management for both text and voice modes
 */

import { createCollector } from './conversationCollector';

export interface SessionInfo {
  dbSessionId: string;
  frontendSessionId: string;
  createdAt: string;
  mode: 'text' | 'voice' | 'hybrid';
}

class SharedSessionManager {
  private static instance: SharedSessionManager;
  private sessionInfo: SessionInfo | null = null;
  private initPromise: Promise<SessionInfo> | null = null;
  
  static getInstance(): SharedSessionManager {
    if (!SharedSessionManager.instance) {
      SharedSessionManager.instance = new SharedSessionManager();
    }
    return SharedSessionManager.instance;
  }

  /**
   * Get or create a persistent database session ID
   * This works for both text and voice modes
   */
  async getOrCreateSession(frontendSessionId: string, mode: 'text' | 'voice' = 'text'): Promise<SessionInfo> {
    // If we already have session info, return it
    if (this.sessionInfo) {
      // Using existing session silently
      return this.sessionInfo;
    }

    // If already initializing, wait for it
    if (this.initPromise) {
      console.log(`[SessionManager] ⏳ Waiting for ongoing initialization...`);
      return this.initPromise;
    }

    // Start new initialization
    this.initPromise = this.initializeSession(frontendSessionId, mode);
    this.sessionInfo = await this.initPromise;
    this.initPromise = null;
    
    return this.sessionInfo;
  }

  private async initializeSession(frontendSessionId: string, mode: 'text' | 'voice'): Promise<SessionInfo> {
    try {
      const storageKey = 'conversation_db_session_id';
      const storedId = localStorage.getItem(storageKey);
      
      if (storedId) {
        // Use existing session ID from localStorage
        console.log(`[SessionManager] 📦 Using stored session: ${storedId} for ${mode} mode`);
        return {
          dbSessionId: storedId,
          frontendSessionId,
          createdAt: localStorage.getItem('conversation_db_session_created') || new Date().toISOString(),
          mode
        };
      }
      
      // Create new DB session
      console.log(`[SessionManager] 🆕 Creating new session for ${mode} mode...`);
      console.log(`[SessionManager] Frontend session ID: ${frontendSessionId}`);
      
      const collector = createCollector();
      console.log(`[SessionManager] Created collector with baseUrl: ${(collector as any).baseUrl}`);
      
      const session = await collector.createSession({
        channel: mode === 'voice' ? 'realtime' : 'normal',
        status: 'active',
        meta: { 
          frontend_session_id: frontendSessionId,
          mode,
          created_by: 'shared_session_manager'
        }
      });
      
      if (session?.id) {
        const now = new Date().toISOString();
        localStorage.setItem(storageKey, session.id);
        localStorage.setItem('conversation_db_session_created', now);
        localStorage.setItem('conversation_db_session_mode', mode);
        
        console.log(`[SessionManager] ✅ Created and stored session: ${session.id} for ${mode} mode`);
        return {
          dbSessionId: session.id,
          frontendSessionId,
          createdAt: now,
          mode
        };
      } else {
        throw new Error('Failed to create session: no ID returned');
      }
    } catch (err) {
      console.error(`[SessionManager] ❌ Failed to create session for ${mode} mode:`, err);
      console.log(`[SessionManager] 🔄 Falling back to frontend session ID: ${frontendSessionId}`);
      
      // Fallback to frontend session
      const fallbackSession: SessionInfo = {
        dbSessionId: frontendSessionId,
        frontendSessionId,
        createdAt: new Date().toISOString(),
        mode
      };
      
      localStorage.setItem('conversation_db_session_id', frontendSessionId);
      return fallbackSession;
    }
  }

  /**
   * Get the current database session ID
   * Returns null if not initialized yet
   */
  getCurrentDbSessionId(): string | null {
    return this.sessionInfo?.dbSessionId || localStorage.getItem('conversation_db_session_id');
  }

  /**
   * Clear the current session (useful for testing or reset)
   */
  clearSession(): void {
    this.sessionInfo = null;
    this.initPromise = null;
    localStorage.removeItem('conversation_db_session_id');
    localStorage.removeItem('conversation_db_session_created');
    localStorage.removeItem('conversation_db_session_mode');
    console.log(`[SessionManager] 🗑️ Session cleared`);
  }

  /**
   * Get session info from localStorage (synchronous)
   */
  getStoredSessionInfo(): Partial<SessionInfo> | null {
    const dbSessionId = localStorage.getItem('conversation_db_session_id');
    if (!dbSessionId) return null;
    
    return {
      dbSessionId,
      createdAt: localStorage.getItem('conversation_db_session_created') || undefined,
      mode: (localStorage.getItem('conversation_db_session_mode') as 'text' | 'voice') || 'text'
    };
  }
}

// Export singleton instance
export const sharedSessionManager = SharedSessionManager.getInstance();

// Convenience functions for easy usage
export async function getOrCreateDbSession(frontendSessionId: string, mode: 'text' | 'voice' = 'text'): Promise<string> {
  const sessionInfo = await sharedSessionManager.getOrCreateSession(frontendSessionId, mode);
  return sessionInfo.dbSessionId;
}

export function getCurrentDbSessionId(): string | null {
  return sharedSessionManager.getCurrentDbSessionId();
}

export function clearCurrentSession(): void {
  sharedSessionManager.clearSession();
}
