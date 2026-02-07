import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class MigrateChaptersDto {
  @ApiProperty({
    description: 'Source module ID (chapters will be moved FROM this module)',
    example: '68bd8c756d00b1177b17ee7c',
  })
  @IsNotEmpty()
  @IsString()
  source_module_id: string;

  @ApiProperty({
    description: 'Target module ID (chapters will be moved TO this module)',
    example: '690bee8cafd51a0922669890',
  })
  @IsNotEmpty()
  @IsString()
  target_module_id: string;

  @ApiProperty({
    description: 'Whether to delete the source module after migration (soft delete)',
    example: true,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  delete_source_module?: boolean;
}

export class DeleteOrphanedModulesDto {
  @ApiProperty({
    description: 'Whether to permanently delete modules (true) or soft delete (false)',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hard_delete?: boolean;
}
