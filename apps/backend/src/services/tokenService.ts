import jwt from 'jsonwebtoken';
import { secrets } from '../config/security/secrets';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  iat?: number;
  exp?: number;
}

export class TokenService {
  private readonly secret: string;
  private readonly expiresIn: string;

  constructor() {
    this.secret = secrets.jwtSecret;
    this.expiresIn = '24h';
  }

  generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn } as any);
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.secret) as TokenPayload;
    } catch (error) {
      return null;
    }
  }

  refreshToken(token: string): string | null {
    const payload = this.verifyToken(token);
    if (!payload) return null;
    
    // Generate new token with same payload
    return this.generateToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
    });
  }
}

export const tokenService = new TokenService();
