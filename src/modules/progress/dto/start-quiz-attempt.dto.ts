import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';
import { Types } from 'mongoose';

export class StartQuizAttemptDto {
  @IsMongoId({ message: 'Quiz Group ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Quiz Group ID is required' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the quiz group to start',
  })
  quiz_group_id: string | Types.ObjectId;
} 