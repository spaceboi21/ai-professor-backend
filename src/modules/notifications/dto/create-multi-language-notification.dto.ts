import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
} from 'class-validator';
import { Types } from 'mongoose';
import { RecipientTypeEnum } from 'src/database/schemas/tenant/notification.schema';
import { NotificationTypeEnum } from 'src/common/constants/notification.constant';

export class CreateMultiLanguageNotificationDto {
  @IsNotEmpty({ message: 'Recipient ID is required' })
  @ApiProperty({
    description: 'ID of the notification recipient',
    example: '507f1f77bcf86cd799439011',
  })
  recipient_id: Types.ObjectId;

  @IsNotEmpty({ message: 'Recipient type is required' })
  @IsEnum(RecipientTypeEnum, {
    message: 'Recipient type must be either "STUDENT" or "PROFESSOR"',
  })
  @ApiProperty({
    description: 'Type of recipient (STUDENT or PROFESSOR)',
    enum: RecipientTypeEnum,
    example: RecipientTypeEnum.STUDENT,
  })
  recipient_type: RecipientTypeEnum;

  @IsNotEmpty({ message: 'English title is required' })
  @IsString({ message: 'English title must be a string' })
  @ApiProperty({
    description: 'Notification title in English',
    example: 'Module Published',
  })
  title_en: string;

  @IsNotEmpty({ message: 'French title is required' })
  @IsString({ message: 'French title must be a string' })
  @ApiProperty({
    description: 'Notification title in French',
    example: 'Module Publié',
  })
  title_fr: string;

  @IsNotEmpty({ message: 'English message is required' })
  @IsString({ message: 'English message must be a string' })
  @ApiProperty({
    description: 'Notification message in English',
    example: 'A new module has been published and is now available.',
  })
  message_en: string;

  @IsNotEmpty({ message: 'French message is required' })
  @IsString({ message: 'French message must be a string' })
  @ApiProperty({
    description: 'Notification message in French',
    example: 'Un nouveau module a été publié et est maintenant disponible.',
  })
  message_fr: string;

  @IsNotEmpty({ message: 'Notification type is required' })
  @IsEnum(NotificationTypeEnum, {
    message: 'Invalid notification type',
  })
  @ApiProperty({
    description: 'Type of notification',
    enum: NotificationTypeEnum,
    example: NotificationTypeEnum.MODULE_PUBLISHED,
  })
  type: NotificationTypeEnum;

  @IsOptional()
  @IsObject({ message: 'Metadata must be an object' })
  @ApiProperty({
    description: 'Additional metadata for the notification',
    example: {
      module_id: '507f1f77bcf86cd799439011',
      module_title: 'Mathematics',
    },
    required: false,
  })
  metadata?: Record<string, any>;

  @IsNotEmpty({ message: 'School ID is required' })
  @ApiProperty({
    description: 'ID of the school',
    example: '507f1f77bcf86cd799439011',
  })
  school_id: Types.ObjectId;
}
