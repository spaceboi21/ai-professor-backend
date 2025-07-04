import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { VerificationMail } from './type';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

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
}
