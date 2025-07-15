import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(@InjectQueue('mail-queue') private readonly mailQueue: Queue) {}

  /**
   * Add a job to the mail queue
   */
  async addMailJob(
    jobName: string,
    data: any,
    options?: {
      attempts?: number;
      delay?: number;
      priority?: number;
    },
  ): Promise<void> {
    const defaultOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    };

    await this.mailQueue.add(jobName, data, {
      ...defaultOptions,
      ...options,
    });

    this.logger.log(`Mail job '${jobName}' queued`);
  }

  /**
   * Add multiple jobs to the mail queue
   */
  async addBulkMailJobs(
    jobs: Array<{
      name: string;
      data: any;
      options?: {
        attempts?: number;
        delay?: number;
        priority?: number;
      };
    }>,
  ): Promise<void> {
    const defaultOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    };

    const queueJobs = jobs.map(({ name, data, options }) => ({
      name,
      data,
      opts: {
        ...defaultOptions,
        ...options,
      },
    }));

    await this.mailQueue.addBulk(queueJobs);
    this.logger.log(`Bulk mail jobs queued: ${jobs.length} jobs`);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const waiting = await this.mailQueue.getWaiting();
    const active = await this.mailQueue.getActive();
    const completed = await this.mailQueue.getCompleted();
    const failed = await this.mailQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  /**
   * Get queue instance for direct access
   */
  getMailQueue(): Queue {
    return this.mailQueue;
  }
}
