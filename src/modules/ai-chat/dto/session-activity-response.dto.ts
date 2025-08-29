import { ApiProperty } from '@nestjs/swagger';
import { AIMessageResponseDto } from './ai-message-response.dto';
import { AIFeedbackResponseDto } from './ai-feedback-response.dto';
import { AIResourceResponseDto } from './ai-resource-response.dto';

export enum SessionActivityTypeEnum {
  MESSAGE = 'message',
  FEEDBACK = 'feedback',
  RESOURCE = 'resource',
}

export class SessionActivityItemDto {
  @ApiProperty({
    description: 'Type of activity item',
    enum: SessionActivityTypeEnum,
    example: SessionActivityTypeEnum.MESSAGE,
  })
  type: SessionActivityTypeEnum;

  @ApiProperty({
    description: 'Creation date of the activity item',
    example: '2024-01-15T10:05:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Activity item data - structure depends on type',
    oneOf: [
      { $ref: '#/components/schemas/AIMessageResponseDto' },
      { $ref: '#/components/schemas/AIFeedbackResponseDto' },
      { $ref: '#/components/schemas/AIResourceResponseDto' },
    ],
  })
  data: AIMessageResponseDto | AIFeedbackResponseDto | AIResourceResponseDto;
}

export class SessionActivityResponseDto {
  @ApiProperty({
    description: 'Combined and sorted list of session activities (messages, feedback, resources only)',
    type: [SessionActivityItemDto],
  })
  activities: SessionActivityItemDto[];

  @ApiProperty({
    description: 'Session details object (separate from activities)',
    example: {
      _id: '507f1f77bcf86cd799439011',
      session_title: 'Cardiology Case Study',
      status: 'active',
      created_at: '2024-01-15T10:00:00.000Z'
    },
  })
  sessionDetails: any;

  @ApiProperty({
    description: 'Total count of activities (excludes session details)',
    example: 15,
  })
  total_count: number;

  @ApiProperty({
    description: 'Count of messages',
    example: 8,
  })
  messages_count: number;

  @ApiProperty({
    description: 'Count of feedback items',
    example: 2,
  })
  feedback_count: number;

  @ApiProperty({
    description: 'Count of resources',
    example: 5,
  })
  resources_count: number;
}
