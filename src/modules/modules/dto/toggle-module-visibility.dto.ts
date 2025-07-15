import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { Types } from 'mongoose';
import { ModuleVisibilityActionEnum } from 'src/common/constants/module.constant';

export class ToggleModuleVisibilityDto {
  @IsOptional()
  @IsMongoId({ message: 'School ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'School ID (required for super admin, optional for other roles)',
    required: false,
  })
  school_id?: string | Types.ObjectId;

  @IsMongoId({ message: 'Module ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Module ID is required' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the module to toggle visibility',
  })
  module_id: string | Types.ObjectId;

  @IsEnum(ModuleVisibilityActionEnum, {
    message: 'Action must be either PUBLISH or UNPUBLISH',
  })
  @IsNotEmpty({ message: 'Action is required' })
  @ApiProperty({
    enum: ModuleVisibilityActionEnum,
    example: ModuleVisibilityActionEnum.PUBLISH,
    description: 'Action to perform: PUBLISH or UNPUBLISH',
  })
  action: ModuleVisibilityActionEnum;
}
