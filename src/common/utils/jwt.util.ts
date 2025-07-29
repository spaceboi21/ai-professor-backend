import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RoleEnum } from '../constants/roles.constant';

export interface JWTPayload {
  id: string;
  email: string;
  role_id: string;
  role_name: RoleEnum;
  school_id?: string;
  exp?: number;
}

@Injectable()
export class JwtUtil {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateToken(
    payload: Omit<JWTPayload, 'exp' | 'iat'>,
    expiresIn?: string,
  ): string {
    const defaultExpiresIn =
      this.configService.get<string>('JWT_EXPIRY') || '24h';
    const tokenExpiresIn = expiresIn || defaultExpiresIn;
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    return this.jwtService.sign(payload, {
      expiresIn: tokenExpiresIn,
      secret,
    });
  }

  verifyToken(token: string): JWTPayload {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');

      if (!secret) {
        throw new Error('JWT_SECRET is not configured');
      }
      return this.jwtService.verify<JWTPayload>(token, { secret });
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
