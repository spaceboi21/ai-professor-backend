import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SimulationModeEnum } from 'src/database/schemas/central/simulation-session.schema';

export class StartSimulationDto {
  @ApiProperty({
    description: 'ID of the student to simulate/impersonate',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  @IsNotEmpty()
  student_id: string;

  @ApiProperty({
    description: 'Simulation mode - DUMMY_STUDENT for test accounts, READ_ONLY_IMPERSONATION for real student view',
    enum: SimulationModeEnum,
    example: SimulationModeEnum.READ_ONLY_IMPERSONATION,
  })
  @IsEnum(SimulationModeEnum)
  @IsNotEmpty()
  simulation_mode: SimulationModeEnum;

  @ApiPropertyOptional({
    description: 'Purpose or reason for the simulation (for audit purposes)',
    example: 'Testing module flow for quality assurance',
  })
  @IsString()
  @IsOptional()
  purpose?: string;

  @ApiPropertyOptional({
    description: 'School ID (required for SUPER_ADMIN)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  @IsOptional()
  school_id?: string;
}

