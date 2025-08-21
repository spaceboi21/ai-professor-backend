import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';
import { Types } from 'mongoose';

export class PinDiscussionDto {
  @IsMongoId({ message: 'Discussion ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Discussion ID is required' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the discussion to pin/unpin',
  })
  discussion_id: string | Types.ObjectId;
}
