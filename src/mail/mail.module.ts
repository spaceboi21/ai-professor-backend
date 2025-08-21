import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { BullModule } from '@nestjs/bull';
import { MailService } from './mail.service';
import { QueueModule } from 'src/common/queue/queue.module';
import { QueueService } from 'src/common/queue/queue.service';
import { MailQueueProcessor } from 'src/common/processors/mail-queue.processor';
import { join } from 'path';

const templateDir = join(process.cwd(), 'src', 'mail', 'templates');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Ensure global access if required
    }),
    MailerModule.forRootAsync({
      useFactory: () => ({
        transport: {
          host: process.env.MAIL_HOST || 'localhost',
          port: Number(process.env.MAIL_PORT) || 587,
          secure: false, // Set to true if using SSL
          auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
          },
        },
        defaults: {
          from: '"Support" <support@example.com>',
        },
        template: {
          dir: templateDir,
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'mail-queue', // 👈 THIS LINE IS CRUCIAL
    }),
    QueueModule,
  ],
  providers: [MailService, QueueService, MailQueueProcessor],
  exports: [MailService],
})
export class MailModule {}
