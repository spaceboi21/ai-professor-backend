import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { QueueService } from 'src/common/queue/queue.service';
import {
  LanguageEnum,
  DEFAULT_LANGUAGE,
} from 'src/common/constants/language.constant';
import { RoleEnum } from 'src/common/constants/roles.constant';

describe('MailService', () => {
  let service: MailService;
  let mailerService: MailerService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                LOGO_URL: 'https://example.com/logo.png',
                STUDENT_PORTAL_URL: 'https://student.example.com',
                SCHOOL_PORTAL_URL: 'https://school.example.com',
                ADMIN_PORTAL_URL: 'https://admin.example.com',
              };
              return config[key];
            }),
          },
        },
        {
          provide: QueueService,
          useValue: {
            addMailJob: jest.fn(),
            addBulkMailJobs: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    mailerService = module.get<MailerService>(MailerService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendPasswordResetEmail', () => {
    it('should send English email when language is English', async () => {
      const sendMailSpy = jest
        .spyOn(mailerService, 'sendMail')
        .mockResolvedValue({} as any);

      await service.sendPasswordResetEmail(
        'test@example.com',
        'John Doe',
        'https://example.com/reset',
        LanguageEnum.ENGLISH,
      );

      expect(sendMailSpy).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Password Reset Request',
        template: 'forgot-password-email',
        context: {
          userName: 'John Doe',
          resetPasswordLink: 'https://example.com/reset',
          logoUrl: 'https://example.com/logo.png',
        },
      });
    });

    it('should send French email when language is French', async () => {
      const sendMailSpy = jest
        .spyOn(mailerService, 'sendMail')
        .mockResolvedValue({} as any);

      await service.sendPasswordResetEmail(
        'test@example.com',
        'John Doe',
        'https://example.com/reset',
        LanguageEnum.FRENCH,
      );

      expect(sendMailSpy).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Demande de réinitialisation de mot de passe',
        template: 'forgot-password-email-fr',
        context: {
          userName: 'John Doe',
          resetPasswordLink: 'https://example.com/reset',
          logoUrl: 'https://example.com/logo.png',
        },
      });
    });

    it('should use default language (French) when no language is provided', async () => {
      const sendMailSpy = jest
        .spyOn(mailerService, 'sendMail')
        .mockResolvedValue({} as any);

      await service.sendPasswordResetEmail(
        'test@example.com',
        'John Doe',
        'https://example.com/reset',
      );

      expect(sendMailSpy).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Demande de réinitialisation de mot de passe',
        template: 'forgot-password-email-fr',
        context: {
          userName: 'John Doe',
          resetPasswordLink: 'https://example.com/reset',
          logoUrl: 'https://example.com/logo.png',
        },
      });
    });
  });

  describe('sendCredentialsEmail', () => {
    it('should send English credentials email when language is English', async () => {
      const sendMailSpy = jest
        .spyOn(mailerService, 'sendMail')
        .mockResolvedValue({} as any);

      await service.sendCredentialsEmail(
        'test@example.com',
        'John Doe',
        'password123',
        RoleEnum.STUDENT,
        LanguageEnum.ENGLISH,
      );

      expect(sendMailSpy).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Welcome to AI Professor - Your Account Credentials',
        template: 'credentials-email',
        context: {
          name: 'John Doe',
          email: 'test@example.com',
          password: 'password123',
          role: 'student',
          logoUrl: 'https://example.com/logo.png',
          portal_url: 'https://student.example.com',
        },
      });
    });

    it('should send French credentials email when language is French', async () => {
      const sendMailSpy = jest
        .spyOn(mailerService, 'sendMail')
        .mockResolvedValue({} as any);

      await service.sendCredentialsEmail(
        'test@example.com',
        'John Doe',
        'password123',
        RoleEnum.STUDENT,
        LanguageEnum.FRENCH,
      );

      expect(sendMailSpy).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Bienvenue chez AI Professor - Vos identifiants de compte',
        template: 'credentials-email-fr',
        context: {
          name: 'John Doe',
          email: 'test@example.com',
          password: 'password123',
          role: 'student',
          logoUrl: 'https://example.com/logo.png',
          portal_url: 'https://student.example.com',
        },
      });
    });

    it('should use default language (French) when no language is provided', async () => {
      const sendMailSpy = jest
        .spyOn(mailerService, 'sendMail')
        .mockResolvedValue({} as any);

      await service.sendCredentialsEmail(
        'test@example.com',
        'John Doe',
        'password123',
        RoleEnum.STUDENT,
      );

      expect(sendMailSpy).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Bienvenue chez AI Professor - Vos identifiants de compte',
        template: 'credentials-email-fr',
        context: {
          name: 'John Doe',
          email: 'test@example.com',
          password: 'password123',
          role: 'student',
          logoUrl: 'https://example.com/logo.png',
          portal_url: 'https://student.example.com',
        },
      });
    });
  });
});
