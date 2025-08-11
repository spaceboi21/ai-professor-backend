import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';
import { Types } from 'mongoose';

export class DeleteForumAttachmentDto {
  @IsMongoId({ message: 'Attachment ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Attachment ID is required' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the attachment to delete',
  })
  attachment_id: string | Types.ObjectId;
}
