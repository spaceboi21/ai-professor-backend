import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsEnum } from 'class-validator';
import { Types } from 'mongoose';
import { ModuleVisibilityActionEnum } from 'src/common/constants/module.constant';

export class ToggleModuleVisibilityDto {
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
