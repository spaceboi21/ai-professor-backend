import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSequenceDto {
  @ApiPropertyOptional({
    description: 'School ID (required for SUPER_ADMIN)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  school_id?: string;

  @ApiProperty({
    description: 'Internship or case ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty()
  @IsString()
  item_id: string;

  @ApiProperty({
    description: 'New sequence number',
    example: 2,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  sequence: number;
}

