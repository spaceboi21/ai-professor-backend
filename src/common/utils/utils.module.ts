import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtUtil } from './jwt.util';
import { BcryptUtil } from './bcrypt.util';
import { TokenUtil } from './token.util';
import { CSVUtil } from './csv.util';
import { EmailEncryptionUtil } from './email-encryption.util';
import { JwtService } from '@nestjs/jwt';
import { UploadModule } from '../../modules/upload/upload.module';

@Module({
  imports: [ConfigModule, UploadModule],
  providers: [BcryptUtil, JwtUtil, TokenUtil, CSVUtil, EmailEncryptionUtil, JwtService],
  exports: [BcryptUtil, JwtUtil, TokenUtil, CSVUtil, EmailEncryptionUtil],
})
export class UtilsModule {}
