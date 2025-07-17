import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';
import { DifficultyEnum } from 'src/common/constants/difficulty.constant';
import {
  QuizCategoryEnum,
  QuizTypeEnum,
  QuizQuestionTypeEnum,
} from 'src/common/constants/quiz.constant';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QuizGroupFilterDto extends PaginationDto {
  @IsEnum(QuizCategoryEnum, {
    message: 'Category must be ASSESSMENT, COMMUNICATION, ANXIETY, or TRAUMA',
  })
  @IsOptional()
  @ApiProperty({
    example: QuizCategoryEnum.COMMUNICATION,
    enum: QuizCategoryEnum,
    description: 'Filter by quiz category',
    required: false,
  })
  category?: QuizCategoryEnum;

  @IsEnum(DifficultyEnum, {
    message: 'Difficulty must be BEGINNER, INTERMEDIATE, or ADVANCED',
  })
  @IsOptional()
  @ApiProperty({
    example: DifficultyEnum.INTERMEDIATE,
    enum: DifficultyEnum,
    description: 'Filter by difficulty level',
    required: false,
  })
  difficulty?: DifficultyEnum;

  @IsEnum(QuizTypeEnum, {
    message: 'Type must be MODULE or CHAPTER',
  })
  @IsOptional()
  @ApiProperty({
    example: QuizTypeEnum.MODULE,
    enum: QuizTypeEnum,
    description: 'Filter by quiz type',
    required: false,
  })
  type?: QuizTypeEnum;

  @IsMongoId({ message: 'Module ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Filter by module ID',
    required: false,
  })
  module_id?: string | Types.ObjectId;

  @IsMongoId({ message: 'Chapter ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'Filter by chapter ID',
    required: false,
  })
  chapter_id?: string | Types.ObjectId;
}

export class QuizFilterDto extends PaginationDto {
  @IsMongoId({ message: 'Quiz group ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Filter by quiz group ID',
    required: false,
  })
  quiz_group_id?: string | Types.ObjectId;

  @IsEnum(QuizQuestionTypeEnum, {
    message: 'Type must be MULTI_SELECT, SINGLE_SELECT, or SCENARIO_BASED',
  })
  @IsOptional()
  @ApiProperty({
    example: QuizQuestionTypeEnum.SINGLE_SELECT,
    enum: QuizQuestionTypeEnum,
    description: 'Filter by question type',
    required: false,
  })
  type?: QuizQuestionTypeEnum;

  @IsMongoId({ message: 'Module ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Filter by module ID',
    required: false,
  })
  module_id?: string | Types.ObjectId;

  @IsMongoId({ message: 'Chapter ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'Filter by chapter ID',
    required: false,
  })
  chapter_id?: string | Types.ObjectId;
}
