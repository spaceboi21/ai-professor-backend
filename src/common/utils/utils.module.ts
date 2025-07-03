import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtUtil } from './jwt.util';
import { BcryptUtil } from './bcrypt.util';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [ConfigModule],
  providers: [BcryptUtil, JwtUtil, JwtService],
  exports: [BcryptUtil, JwtUtil],
})
export class UtilsModule {}
