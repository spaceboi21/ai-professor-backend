import { SetMetadata } from '@nestjs/common';
import { ActivityTypeEnum } from 'src/common/constants/activity.constant';

export const LOG_ACTIVITY_KEY = 'logActivity';

export interface LogActivityOptions {
  activityType: ActivityTypeEnum;
  description?: string;
  skipOnSuccess?: boolean;
  skipOnError?: boolean;
}

export const LogActivity = (options: LogActivityOptions) =>
  SetMetadata(LOG_ACTIVITY_KEY, options);
