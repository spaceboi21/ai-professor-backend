import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsMongoId,
  IsDateString,
} from 'class-validator';
import {
  ProgressStatusEnum,
  AttemptStatusEnum,
} from 'src/common/constants/status.constant';
import { Types } from 'mongoose';

export class ProgressFilterDto {
  @IsOptional()
  @IsMongoId({ message: 'Module ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Filter by module ID',
    required: false,
  })
  module_id?: string | Types.ObjectId;

  @IsOptional()
  @IsMongoId({ message: 'Chapter ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Filter by chapter ID',
    required: false,
  })
  chapter_id?: string | Types.ObjectId;

  @IsOptional()
  @IsEnum(ProgressStatusEnum, { message: 'Invalid progress status' })
  @ApiProperty({
    enum: ProgressStatusEnum,
    description: 'Filter by progress status',
    required: false,
  })
  status?: ProgressStatusEnum;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid start date format' })
  @ApiProperty({
    example: '2024-01-01',
    description: 'Filter progress from this date (YYYY-MM-DD)',
    required: false,
  })
  from_date?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid end date format' })
  @ApiProperty({
    example: '2024-12-31',
    description: 'Filter progress until this date (YYYY-MM-DD)',
    required: false,
  })
  to_date?: string;
}

export class QuizAttemptFilterDto {
  @IsOptional()
  @IsMongoId({ message: 'Quiz Group ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Filter by quiz group ID',
    required: false,
  })
  quiz_group_id?: string | Types.ObjectId;

  @IsOptional()
  @IsMongoId({ message: 'Module ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Filter by module ID',
    required: false,
  })
  module_id?: string | Types.ObjectId;

  @IsOptional()
  @IsMongoId({ message: 'Chapter ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Filter by chapter ID',
    required: false,
  })
  chapter_id?: string | Types.ObjectId;

  @IsOptional()
  @IsEnum(AttemptStatusEnum, { message: 'Invalid attempt status' })
  @ApiProperty({
    enum: AttemptStatusEnum,
    description: 'Filter by attempt status',
    required: false,
  })
  status?: AttemptStatusEnum;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid start date format' })
  @ApiProperty({
    example: '2024-01-01',
    description: 'Filter attempts from this date (YYYY-MM-DD)',
    required: false,
  })
  from_date?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid end date format' })
  @ApiProperty({
    example: '2024-12-31',
    description: 'Filter attempts until this date (YYYY-MM-DD)',
    required: false,
  })
  to_date?: string;
}
