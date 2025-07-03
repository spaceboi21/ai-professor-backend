import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtUtil } from './jwt.util';
import { BcryptUtil } from './bcrypt.util';

@Module({
  imports: [ConfigModule],
  providers: [BcryptUtil, JwtUtil],
  exports: [BcryptUtil, JwtUtil],
})
export class UtilsModule {}
