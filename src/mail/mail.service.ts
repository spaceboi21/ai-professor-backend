import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { VerificationMail } from './type';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { ConfigService } from '@nestjs/config';
import { QueueService } from 'src/common/queue/queue.service';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
  ) {}

  async sendPasswordResetEmail(
    email: string,
    userName: string,
    resetPasswordLink: string,
  ) {
    const logoUrl = this.configService.get<string>('LOGO_URL');
    await this.mailerService.sendMail({
      to: email,
      subject: 'Password Reset Request',
      template: 'forgot-password-email',
      context: {
        userName,
        resetPasswordLink,
        logoUrl,
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
    const portal_url =
      role === RoleEnum.STUDENT
        ? this.configService.get<string>('STUDENT_PORTAL_URL')
        : role === RoleEnum.PROFESSOR || role === RoleEnum.SCHOOL_ADMIN
          ? this.configService.get<string>('SCHOOL_PORTAL_URL')
          : this.configService.get<string>('ADMIN_PORTAL_URL');
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
        portal_url,
      },
    });
  }

  /**
   * Queue credentials email for background processing
   */
  async queueCredentialsEmail(
    email: string,
    name: string,
    password: string,
    role: RoleEnum,
  ): Promise<void> {
    await this.queueService.addMailJob('send-credentials', {
      email,
      name,
      password,
      role,
    });
  }

  /**
   * Queue multiple credentials emails for background processing
   */
  async queueBulkCredentialsEmails(
    emails: Array<{
      email: string;
      name: string;
      password: string;
      role: RoleEnum;
    }>,
  ): Promise<void> {
    const jobs = emails.map(({ email, name, password, role }) => ({
      name: 'send-credentials',
      data: { email, name, password, role },
    }));

    await this.queueService.addBulkMailJobs(jobs);
  }

  /**
   * Queue welcome email for background processing
   */
  async queueWelcomeEmail(
    email: string,
    name: string,
    role: RoleEnum,
  ): Promise<void> {
    await this.queueService.addMailJob('send-welcome', {
      email,
      name,
      role,
    });
  }
}
