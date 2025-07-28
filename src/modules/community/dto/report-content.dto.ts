import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  IsEnum,
} from 'class-validator';
import { Types } from 'mongoose';
import {
  ReportEntityTypeEnum,
  ReportTypeEnum,
} from 'src/database/schemas/tenant/forum-report.schema';

export class ReportContentDto {
  @IsOptional()
  @IsMongoId({ message: 'School ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description:
      'School ID (required for super admin, optional for other roles)',
    required: false,
  })
  school_id?: string | Types.ObjectId;

  @IsEnum(ReportEntityTypeEnum, { message: 'Entity type must be a valid type' })
  @IsNotEmpty({ message: 'Entity type is required' })
  @ApiProperty({
    example: ReportEntityTypeEnum.DISCUSSION,
    description: 'Type of entity being reported',
    enum: ReportEntityTypeEnum,
  })
  entity_type: ReportEntityTypeEnum;

  @IsMongoId({ message: 'Entity ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Entity ID is required' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the discussion or reply being reported',
  })
  entity_id: string | Types.ObjectId;

  @IsEnum(ReportTypeEnum, { message: 'Report type must be a valid type' })
  @IsNotEmpty({ message: 'Report type is required' })
  @ApiProperty({
    example: ReportTypeEnum.INAPPROPRIATE_CONTENT,
    description: 'Type of report',
    enum: ReportTypeEnum,
  })
  report_type: ReportTypeEnum;

  @IsString({ message: 'Reason must be a string' })
  @IsNotEmpty({ message: 'Reason is required' })
  @ApiProperty({
    example:
      'This content contains inappropriate language and violates community guidelines',
    description: 'Detailed reason for the report',
  })
  reason: string;
}
