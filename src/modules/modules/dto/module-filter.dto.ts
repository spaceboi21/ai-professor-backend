import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { DifficultyEnum } from 'src/common/constants/difficulty.constant';
import { ProgressStatusEnum } from 'src/common/constants/status.constant';

export enum ModuleSortBy {
  TITLE = 'title',
  DIFFICULTY = 'difficulty',
  CREATED_AT = 'created_at',
  DURATION = 'duration',
  PROGRESS_STATUS = 'progress_status',
  SEQUENCE = 'sequence',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ModuleFilterDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Search text in title and description (case-insensitive)',
    required: false,
    example: 'psychology',
  })
  text?: string;

  @IsOptional()
  @IsEnum(DifficultyEnum)
  @ApiProperty({
    description: 'Filter by difficulty level',
    required: false,
    enum: DifficultyEnum,
    example: DifficultyEnum.INTERMEDIATE,
  })
  difficulty?: DifficultyEnum;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  @ApiProperty({
    description:
      'Filter by published status (only available for non-student users)',
    required: false,
    example: true,
  })
  published?: boolean;

  @IsOptional()
  @IsEnum(ProgressStatusEnum)
  @ApiProperty({
    description:
      'Filter by progress status (only available for students). Use ALL to show all modules regardless of progress status.',
    required: false,
    enum: ProgressStatusEnum,
    example: ProgressStatusEnum.IN_PROGRESS,
  })
  progress_status?: ProgressStatusEnum;

  @IsOptional()
  @IsEnum(ModuleSortBy)
  @ApiProperty({
    description: 'Sort by field',
    required: false,
    enum: ModuleSortBy,
    example: ModuleSortBy.TITLE,
  })
  sortBy?: ModuleSortBy;

  @IsOptional()
  @IsEnum(SortOrder)
  @ApiProperty({
    description: 'Sort order',
    required: false,
    enum: SortOrder,
    example: SortOrder.ASC,
  })
  sortOrder?: SortOrder;
}
