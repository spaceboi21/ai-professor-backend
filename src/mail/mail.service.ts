import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { VerificationMail } from './type';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { ConfigService } from '@nestjs/config';
import { QueueService } from 'src/common/queue/queue.service';
import {
  LanguageEnum,
  DEFAULT_LANGUAGE,
} from 'src/common/constants/language.constant';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Get template name based on language preference
   * @param baseTemplate - Base template name (e.g., 'credentials-email')
   * @param language - User's preferred language
   * @returns Template name with language suffix if not English
   */
  private getTemplateName(
    baseTemplate: string,
    language: LanguageEnum,
  ): string {
    if (language === LanguageEnum.FRENCH) {
      return `${baseTemplate}-fr`;
    }
    return baseTemplate; // Default to English template
  }

  /**
   * Get email subject based on language preference
   * @param baseSubject - Base subject in English
   * @param language - User's preferred language
   * @returns Subject in appropriate language
   */
  private getEmailSubject(baseSubject: string, language: LanguageEnum): string {
    if (language === LanguageEnum.FRENCH) {
      const subjects = {
        'Password Reset Request': 'Demande de réinitialisation de mot de passe',
        'Welcome to AI Professor - Your Account Credentials':
          'Bienvenue chez AI Professor - Vos identifiants de compte',
      };
      return subjects[baseSubject] || baseSubject;
    }
    return baseSubject;
  }

  async sendPasswordResetEmail(
    email: string,
    userName: string,
    resetPasswordLink: string,
    preferredLanguage?: LanguageEnum,
  ) {
    const language = preferredLanguage || DEFAULT_LANGUAGE;
    const logoUrl = this.configService.get<string>('LOGO_URL');
    const templateName = this.getTemplateName(
      'forgot-password-email',
      language,
    );
    const subject = this.getEmailSubject('Password Reset Request', language);

    await this.mailerService.sendMail({
      to: email,
      subject,
      template: templateName,
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
    preferredLanguage?: LanguageEnum,
  ): Promise<void> {
    const language = preferredLanguage || DEFAULT_LANGUAGE;
    const logoUrl = this.configService.get<string>('LOGO_URL');
    const portal_url =
      role === RoleEnum.STUDENT
        ? this.configService.get<string>('STUDENT_PORTAL_URL')
        : role === RoleEnum.PROFESSOR || role === RoleEnum.SCHOOL_ADMIN
          ? this.configService.get<string>('SCHOOL_PORTAL_URL')
          : this.configService.get<string>('ADMIN_PORTAL_URL');

    const templateName = this.getTemplateName('credentials-email', language);
    const subject = this.getEmailSubject(
      'Welcome to AI Professor - Your Account Credentials',
      language,
    );

    await this.mailerService.sendMail({
      to: email,
      subject,
      template: templateName,
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
    preferredLanguage?: LanguageEnum,
  ): Promise<void> {
    await this.queueService.addMailJob('send-credentials', {
      email,
      name,
      password,
      role,
      preferredLanguage,
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
      preferredLanguage?: LanguageEnum;
    }>,
  ): Promise<void> {
    const jobs = emails.map(
      ({ email, name, password, role, preferredLanguage }) => ({
        name: 'send-credentials',
        data: { email, name, password, role, preferredLanguage },
      }),
    );

    await this.queueService.addBulkMailJobs(jobs);
  }
}
