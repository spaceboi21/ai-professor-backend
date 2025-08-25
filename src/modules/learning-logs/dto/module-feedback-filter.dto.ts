import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';

export class ModuleFeedbackFilterDto {
  @ApiProperty({
    description: 'Module ID to get feedback for',
    example: '507f1f77bcf86cd799439011',
    required: true,
  })
  @IsMongoId()
  module_id: string;
}
