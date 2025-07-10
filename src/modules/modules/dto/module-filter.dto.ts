import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { DifficultyEnum } from 'src/common/constants/difficulty.constant';

export enum ModuleSortBy {
  TITLE = 'title',
  DIFFICULTY = 'difficulty',
  CREATED_AT = 'created_at',
  DURATION = 'duration',
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
