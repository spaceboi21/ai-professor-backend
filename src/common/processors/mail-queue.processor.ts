import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
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
export class MailQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(MailQueueProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<MailJobData>): Promise<void> {
    const { name } = job;

    this.logger.log(`Processing mail job: ${name} for: ${job.data.email}`);

    try {
      switch (name) {
        case 'send-credentials':
          await this.handleSendCredentials(job.data as SendCredentialsJobData);
          break;
        case 'send-welcome':
          await this.handleSendWelcome(job.data as SendWelcomeJobData);
          break;
        default:
          throw new Error(`Unknown mail job type: ${name}`);
      }

      this.logger.log(`Mail job '${name}' completed for: ${job.data.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to process mail job '${name}' for ${job.data.email}:`,
        error,
      );
      throw error; // Re-throw to mark job as failed
    }
  }

  private async handleSendCredentials(
    data: SendCredentialsJobData,
  ): Promise<void> {
    const { email, name, password, role } = data;
    await this.mailService.sendCredentialsEmail(email, name, password, role);
  }

  private async handleSendWelcome(data: SendWelcomeJobData): Promise<void> {
    const { email, name, role } = data;
    // You can add a welcome email method to MailService if needed
    // await this.mailService.sendWelcomeEmail(email, name, role);
    this.logger.log(`Welcome email would be sent to: ${email}`);
  }

  async onCompleted(job: Job<MailJobData>): Promise<void> {
    this.logger.log(`Mail job '${job.name}' completed for: ${job.data.email}`);
  }

  async onFailed(job: Job<MailJobData>, err: Error): Promise<void> {
    this.logger.error(
      `Mail job '${job.name}' failed for ${job.data.email}:`,
      err,
    );
  }
}
