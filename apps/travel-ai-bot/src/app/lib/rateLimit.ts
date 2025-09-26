// Simple in-memory rate limiter
// Maps IP addresses to an array of timestamps of their requests
const rateLimitMap = new Map<string, number[]>();

export interface RateLimitConfig {
  // Maximum number of requests allowed within the window
  limit: number;
  // Time window in milliseconds
  windowMs: number;
}

export function rateLimit(ip: string, config: RateLimitConfig): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const windowMs = config.windowMs;
  
  // Get existing timestamps for this IP or initialize empty array
  const timestamps = rateLimitMap.get(ip) || [];
  
  // Filter out timestamps that are outside of the current window
  const recentTimestamps = timestamps.filter(timestamp => now - timestamp < windowMs);
  
  // Add current timestamp
  recentTimestamps.push(now);
  
  // Update the map
  rateLimitMap.set(ip, recentTimestamps);
  
  // Check if rate limit is exceeded
  const isRateLimited = recentTimestamps.length > config.limit;
  
  // Calculate time until reset (when oldest timestamp will be outside window)
  const oldestTimestamp = recentTimestamps[0] || now;
  const resetTime = Math.max(0, oldestTimestamp + windowMs - now);
  
  return {
    success: !isRateLimited,
    limit: config.limit,
    remaining: Math.max(0, config.limit - recentTimestamps.length),
    reset: Math.floor(resetTime / 1000), // Reset time in seconds
  };
} 