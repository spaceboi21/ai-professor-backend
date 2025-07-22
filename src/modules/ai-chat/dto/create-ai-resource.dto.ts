import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  ResourceCategoryEnum,
  ResourceTypeEnum,
} from 'src/common/constants/ai-resource.constant';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAIResourceDto {
  @ApiProperty({
    description: 'AI session ID',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsMongoId()
  session_id: string;

  @ApiProperty({
    description: 'Module ID',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsMongoId()
  module_id: string;

  @ApiProperty({
    description: 'Resource title',
    example: 'Cardiology Diagnosis Guidelines',
    type: String,
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Resource description',
    example:
      'Comprehensive guide to cardiology diagnosis and treatment protocols',
    type: String,
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Type of resource',
    enum: ResourceTypeEnum,
    example: ResourceTypeEnum.ARTICLE,
  })
  @IsEnum(ResourceTypeEnum)
  resource_type: ResourceTypeEnum;

  @ApiProperty({
    description: 'Resource category',
    enum: ResourceCategoryEnum,
    example: ResourceCategoryEnum.STUDY_MATERIAL,
  })
  @IsEnum(ResourceCategoryEnum)
  category: ResourceCategoryEnum;

  @ApiProperty({
    description: 'Resource URL or link',
    example: 'https://example.com/cardiology-guidelines',
    type: String,
  })
  @IsString()
  url: string;

  @ApiProperty({
    description: 'Resource tags',
    example: ['cardiology', 'diagnosis', 'guidelines'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    description: 'Keywords related to the resource',
    example: ['cardiology', 'diagnosis', 'treatment'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiProperty({
    description: 'Mistakes this resource addresses',
    example: ['Incorrect diagnosis', 'Missing vital signs'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  related_mistakes?: string[];

  @ApiProperty({
    description: 'Duration in minutes',
    example: 30,
    required: false,
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  duration_minutes?: number;

  @ApiProperty({
    description: 'Resource author',
    example: 'Dr. John Smith',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiProperty({
    description: 'Resource source',
    example: 'American Medical Association',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({
    description: 'Difficulty level (1-5)',
    example: 3,
    required: false,
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  difficulty_level?: number;

  @ApiProperty({
    description: 'Whether this is a recommended resource',
    example: true,
    required: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  is_recommended?: boolean;
}
