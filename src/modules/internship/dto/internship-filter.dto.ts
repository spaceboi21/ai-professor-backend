import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ProgressStatusEnum } from 'src/common/constants/status.constant';
import { InternshipSortBy } from 'src/common/constants/internship.constant';

export class InternshipFilterDto {
  @ApiPropertyOptional({
    description: 'Search text in title and description',
    example: 'clinical',
  })
  @IsOptional()
  text?: string;

  @ApiPropertyOptional({
    description: 'Filter by year (1-5)',
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  year?: number;

  @ApiPropertyOptional({
    description: 'Filter by published status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  published?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by progress status (for students)',
    enum: ProgressStatusEnum,
    example: ProgressStatusEnum.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(ProgressStatusEnum)
  progress_status?: ProgressStatusEnum;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: InternshipSortBy,
    example: InternshipSortBy.SEQUENCE,
  })
  @IsOptional()
  @IsEnum(InternshipSortBy)
  sortBy?: InternshipSortBy;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'asc',
  })
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

