import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { MailService } from 'src/mail/mail.service';
import { RoleEnum } from 'src/common/constants/roles.constant';

export interface SendCredentialsJobData {
  email: string;
  name: string;
  password: string;
  role: RoleEnum;
}

export interface SendWelcomeJobData {
  email: string;
  name: string;
  role: RoleEnum;
}

export type MailJobData = SendCredentialsJobData | SendWelcomeJobData;

@Processor('mail-queue')
export class MailQueueProcessor {
  private readonly logger = new Logger(MailQueueProcessor.name);

  constructor(private readonly mailService: MailService) {}

  @Process('send-credentials')
  async handleSendCredentials(job: Job<SendCredentialsJobData>): Promise<void> {
    const { email, name, password, role } = job.data;
    
    this.logger.log(`Processing send-credentials job for: ${email}`);

    try {
      await this.mailService.sendCredentialsEmail(email, name, password, role);
      this.logger.log(`Credentials email sent successfully to: ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send credentials email to ${email}:`, error);
      throw error;
    }
  }

  @Process('send-welcome')
  async handleSendWelcome(job: Job<SendWelcomeJobData>): Promise<void> {
    const { email, name, role } = job.data;
    
    this.logger.log(`Processing send-welcome job for: ${email}`);

    try {
      // You can add a welcome email method to MailService if needed
      // await this.mailService.sendWelcomeEmail(email, name, role);
      this.logger.log(`Welcome email would be sent to: ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}:`, error);
      throw error;
    }
  }
}
