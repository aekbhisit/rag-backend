import { cacheService } from './cacheService';

interface LoginAttempt {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}

export class LoginAttemptService {
  private readonly maxAttempts = 5;
  private readonly lockoutDuration = 15 * 60 * 1000; // 15 minutes

  async recordFailedAttempt(identifier: string): Promise<void> {
    const key = `login_attempts:${identifier}`;
    const attempts = await cacheService.get(key) as LoginAttempt || { count: 0, lastAttempt: 0 };
    
    attempts.count += 1;
    attempts.lastAttempt = Date.now();
    
    if (attempts.count >= this.maxAttempts) {
      attempts.lockedUntil = Date.now() + this.lockoutDuration;
    }
    
    await cacheService.set(key, attempts, 3600); // 1 hour expiry
  }

  async recordSuccessfulAttempt(identifier: string): Promise<void> {
    const key = `login_attempts:${identifier}`;
    await cacheService.delete(key);
  }

  async isAccountLocked(identifier: string): Promise<boolean> {
    const key = `login_attempts:${identifier}`;
    const attempts = await cacheService.get(key) as LoginAttempt;
    
    if (!attempts || !attempts.lockedUntil) return false;
    
    if (Date.now() < attempts.lockedUntil) {
      return true;
    }
    
    // Lock expired, clear attempts
    await cacheService.delete(key);
    return false;
  }

  async getRemainingAttempts(identifier: string): Promise<number> {
    const key = `login_attempts:${identifier}`;
    const attempts = await cacheService.get(key) as LoginAttempt;
    
    if (!attempts) return this.maxAttempts;
    return Math.max(0, this.maxAttempts - attempts.count);
  }
}

export const loginAttemptService = new LoginAttemptService();
