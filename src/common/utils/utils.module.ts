import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtUtil } from './jwt.util';
import { BcryptUtil } from './bcrypt.util';
import { TokenUtil } from './token.util';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [ConfigModule],
  providers: [BcryptUtil, JwtUtil, TokenUtil, JwtService],
  exports: [BcryptUtil, JwtUtil, TokenUtil],
})
export class UtilsModule {}
