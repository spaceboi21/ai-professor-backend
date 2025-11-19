import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  ValidateNested,
  IsNumber,
  IsString,
  IsBoolean,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WorkflowStepTypeEnum } from 'src/common/constants/internship.constant';

class WorkflowStepDto {
  @ApiProperty({ description: 'Step number', example: 1 })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  step_number: number;

  @ApiProperty({
    description: 'Step type',
    enum: WorkflowStepTypeEnum,
    example: WorkflowStepTypeEnum.PATIENT_SIMULATION,
  })
  @IsEnum(WorkflowStepTypeEnum)
  step_type: WorkflowStepTypeEnum;

  @ApiProperty({ description: 'Step name', example: 'Patient Interview' })
  @IsString()
  step_name: string;

  @ApiProperty({ description: 'Is this step required?', example: true })
  @IsBoolean()
  is_required: boolean;

  @ApiProperty({ description: 'Order in workflow', example: 1 })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  order: number;
}

export class CreateWorkflowDto {
  @ApiProperty({
    description: 'Array of workflow steps',
    type: [WorkflowStepDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  workflow_steps: WorkflowStepDto[];
}

