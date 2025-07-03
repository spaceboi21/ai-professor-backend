import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  schoolDbName?: string;
  exp?: number;
}

@Injectable()
export class JwtUtil {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateToken(payload: Omit<JWTPayload, 'exp' | 'iat'>): string {
    const expiresIn = this.configService.get<string>('JWT_EXPIRY') || '24h';
    return this.jwtService.sign(payload, { expiresIn });
  }

  verifyToken(token: string): JWTPayload {
    try {
      return this.jwtService.verify<JWTPayload>(token);
    } catch (error) {
      throw new UnauthorizedException(`Invalid token: ${error.message}`);
    }
  }

  decodeToken(token: string): JWTPayload | null {
    try {
      return this.jwtService.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }

  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}
