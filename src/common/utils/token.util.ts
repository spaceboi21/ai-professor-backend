import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RoleEnum } from '../constants/roles.constant';
import { LanguageEnum, DEFAULT_LANGUAGE } from '../constants/language.constant';
import { ErrorMessageService } from '../services/error-message.service';

export interface AccessTokenPayload {
  id: string;
  email: string;
  role_id: string;
  role_name: RoleEnum;
  school_id?: string;
  token_type: 'access';
  exp?: number;
}

export interface RefreshTokenPayload {
  id: string;
  email: string;
  role_id: string;
  role_name: RoleEnum;
  school_id?: string;
  token_type: 'refresh';
  exp?: number;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  access_token_expires_in: number;
  refresh_token_expires_in: number;
}

@Injectable()
export class TokenUtil {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly errorMessageService: ErrorMessageService,
  ) {}

  generateAccessToken(
    payload: Omit<AccessTokenPayload, 'token_type' | 'exp' | 'iat'>,
  ): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const expiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRY') || '15m';

    return this.jwtService.sign(
      { ...payload, token_type: 'access' },
      {
        expiresIn,
        secret,
      },
    );
  }

  generateRefreshToken(
    payload: Omit<RefreshTokenPayload, 'token_type' | 'exp' | 'iat'>,
  ): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const expiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRY') || '30d';

    return this.jwtService.sign(
      { ...payload, token_type: 'refresh' },
      {
        expiresIn,
        secret,
      },
    );
  }

  generateTokenPair(
    payload: Omit<AccessTokenPayload, 'token_type' | 'exp' | 'iat'>,
  ): TokenPair {
    const access_token = this.generateAccessToken(payload);
    const refresh_token = this.generateRefreshToken(payload);

    const access_expires_in = this.getTokenExpiryInSeconds(
      this.configService.get<string>('JWT_ACCESS_EXPIRY') || '15m',
    );
    const refresh_expires_in = this.getTokenExpiryInSeconds(
      this.configService.get<string>('JWT_REFRESH_EXPIRY') || '30d',
    );

    return {
      access_token,
      refresh_token,
      access_token_expires_in: access_expires_in,
      refresh_token_expires_in: refresh_expires_in,
    };
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        throw new Error('JWT_SECRET is not configured');
      }

      const payload = this.jwtService.verify<AccessTokenPayload>(token, {
        secret,
      });

      if (payload.token_type !== 'access') {
        throw new UnauthorizedException(
          this.errorMessageService.getMessageWithLanguage(
            'AUTH',
            'INVALID_TOKEN_TYPE',
            DEFAULT_LANGUAGE,
          ),
        );
      }

      return payload;
    } catch (error) {
      throw new UnauthorizedException(
        this.errorMessageService.getMessageWithParamsAndLanguage(
          'AUTH',
          'INVALID_ACCESS_TOKEN',
          { error: error.message },
          DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        throw new Error('JWT_SECRET is not configured');
      }

      const payload = this.jwtService.verify<RefreshTokenPayload>(token, {
        secret,
      });

      if (payload.token_type !== 'refresh') {
        throw new UnauthorizedException(
          this.errorMessageService.getMessageWithLanguage(
            'AUTH',
            'INVALID_TOKEN_TYPE',
            DEFAULT_LANGUAGE,
          ),
        );
      }

      return payload;
    } catch (error) {
      throw new UnauthorizedException(
        this.errorMessageService.getMessageWithParamsAndLanguage(
          'AUTH',
          'INVALID_REFRESH_TOKEN',
          { error: error.message },
          DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  private getTokenExpiryInSeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 900; // 15 minutes default
    }
  }
}
