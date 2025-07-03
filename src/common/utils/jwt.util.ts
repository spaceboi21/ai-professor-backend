import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  schoolDbName?: string;
  exp?: number;
  iat?: number;
}

@Injectable()
export class JwtUtil {
  constructor(private readonly configService: ConfigService) {}

  private get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET') || 'your-secret-key';
  }

  private get jwtExpiry(): string {
    return this.configService.get<string>('JWT_EXPIRY') || '24h';
  }

  /**
   * Generate JWT token
   */
  generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    const options: SignOptions = {
      expiresIn: this.jwtExpiry as any,
    };

    return jwt.sign(payload, this.jwtSecret, options);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as JWTPayload;
    } catch (error: any) {
      throw new Error(`Invalid token: ${error.message}`);
    }
  }

  /**
   * Decode token without verification (useful for expired tokens)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}
