import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class SortingDto {
  @ApiProperty({
    description: 'Field to sort by',
    example: 'name',
    required: false,
    enum: ['name', 'email', 'created_at', 'updated_at'],
  })
  @IsOptional()
  @IsString({ message: 'Sort field must be a string' })
  @IsIn(['name', 'email', 'created_at', 'updated_at'], {
    message: 'Invalid sort field',
  })
  sortBy?: string;

  @ApiProperty({
    description: 'Sort order',
    example: 'asc',
    required: false,
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsString({ message: 'Sort order must be a string' })
  @IsIn(['asc', 'desc'], {
    message: 'Sort order must be either "asc" or "desc"',
  })
  sortOrder?: 'asc' | 'desc' = 'asc';
}
