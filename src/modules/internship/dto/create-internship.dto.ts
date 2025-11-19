import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';

export class CreateInternshipDto {
  @ApiPropertyOptional({
    description: 'School ID (required for SUPER_ADMIN)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  school_id?: string | Types.ObjectId;

  @ApiProperty({
    description: 'Title of the internship',
    example: 'Clinical Psychology Internship',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Description of the internship',
    example: 'A comprehensive internship covering clinical psychology cases',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Guidelines for the internship (rich text/markdown)',
    example: '# Guidelines\n\n1. Complete all cases in order\n2. Reflect on your learning',
  })
  @IsOptional()
  @IsString()
  guidelines?: string;

  @ApiProperty({
    description: 'Year level (1-5)',
    example: 3,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  year: number;

  @ApiPropertyOptional({
    description: 'Sequence number for ordering',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  sequence?: number;

  @ApiPropertyOptional({
    description: 'Thumbnail image URL',
    example: '/uploads/internship-thumbnail.jpg',
  })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiPropertyOptional({
    description: 'Estimated duration in hours',
    example: 40,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  duration?: number;
}

