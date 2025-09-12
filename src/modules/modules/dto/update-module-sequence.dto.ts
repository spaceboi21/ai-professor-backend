import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateModuleSequenceDto {
  @ApiProperty({
    description: 'The ID of the module to update sequence',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty()
  module_id: string;

  @ApiProperty({
    description: 'The new sequence number for the module',
    example: 3,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  sequence: number;

  @ApiProperty({
    description: 'School ID (required for SUPER_ADMIN, optional for others)',
    example: '507f1f77bcf86cd799439012',
    required: false,
  })
  @IsOptional()
  school_id?: string;
}

export class BulkUpdateModuleSequenceDto {
  @ApiProperty({
    description: 'Array of module sequence updates',
    type: [UpdateModuleSequenceDto],
  })
  @IsNotEmpty()
  updates: UpdateModuleSequenceDto[];

  @ApiProperty({
    description: 'School ID (required for SUPER_ADMIN, optional for others)',
    example: '507f1f77bcf86cd799439012',
    required: false,
  })
  @IsOptional()
  school_id?: string;
}

export class ModuleSequenceResponseDto {
  @ApiProperty({
    description: 'The ID of the module',
    example: '507f1f77bcf86cd799439011',
  })
  module_id: string;

  @ApiProperty({
    description: 'The new sequence number',
    example: 3,
  })
  sequence: number;

  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Error message if any',
    example: null,
    required: false,
  })
  error?: string;
}

export class BulkModuleSequenceResponseDto {
  @ApiProperty({
    description: 'Array of module sequence update results',
    type: [ModuleSequenceResponseDto],
  })
  results: ModuleSequenceResponseDto[];

  @ApiProperty({
    description: 'Total number of updates processed',
    example: 5,
  })
  total_processed: number;

  @ApiProperty({
    description: 'Number of successful updates',
    example: 4,
  })
  successful_updates: number;

  @ApiProperty({
    description: 'Number of failed updates',
    example: 1,
  })
  failed_updates: number;
}
