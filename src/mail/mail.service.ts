import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { VerificationMail } from './type';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendVerificationEmail(data: VerificationMail): Promise<void> {
    const { email, name, verificationCode } = data;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Email Verification',
      template: 'verification-email',
      context: {
        name,
        verificationCode,
      },
    });
  }

  async sendPasswordResetEmail(
    email: string,
    userName: string,
    resetPasswordLink: string,
  ) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Password Reset Request',
      template: 'forgot-password-email',
      context: {
        userName,
        resetPasswordLink,
      },
    });
  }

  async sendCredentialsEmail(
    email: string,
    name: string,
    password: string,
    role: RoleEnum,
  ): Promise<void> {
    const logoUrl = this.configService.get<string>('LOGO_URL');
    await this.mailerService.sendMail({
      to: email,
      subject: 'Welcome to AI Professor - Your Account Credentials',
      template: 'credentials-email',
      context: {
        name,
        email,
        password,
        role: role.replace(/_/g, ' ').toLowerCase(),
        logoUrl,
      },
    });
  }
}
