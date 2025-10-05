interface SecretsConfig {
  jwtSecret: string;
  bcryptRounds: number;
  databaseUrl: string;
  redisUrl?: string;
}

export function getSecrets(): SecretsConfig {
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development-only';
  const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
  
  return {
    jwtSecret,
    bcryptRounds,
    databaseUrl: process.env.DATABASE_URL!,
    redisUrl: process.env.REDIS_URL,
  };
}

export const secrets = getSecrets();
