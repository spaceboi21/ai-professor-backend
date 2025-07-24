import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  IsArray,
} from 'class-validator';
import { Types } from 'mongoose';

export class AssignProfessorDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Module ID',
  })
  @IsMongoId({ message: 'Module ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Module ID is required' })
  module_id: string | Types.ObjectId;

  @ApiProperty({
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    description: 'Array of professor IDs to assign',
    type: [String],
  })
  @IsArray({ message: 'Professor IDs must be an array' })
  @IsMongoId({
    each: true,
    message: 'Each professor ID must be a valid MongoDB ObjectId',
  })
  @IsNotEmpty({ each: true, message: 'Professor ID cannot be empty' })
  professor_ids: (string | Types.ObjectId)[];

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description:
      'School ID (required for super admin, optional for other roles)',
    required: false,
  })
  @IsOptional()
  @IsMongoId({ message: 'School ID must be a valid MongoDB ObjectId' })
  school_id?: string | Types.ObjectId;
}

export class UnassignProfessorDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Module ID',
  })
  @IsMongoId({ message: 'Module ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Module ID is required' })
  module_id: string | Types.ObjectId;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Professor ID',
  })
  @IsMongoId({ message: 'Professor ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Professor ID is required' })
  professor_id: string | Types.ObjectId;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description:
      'School ID (required for super admin, optional for other roles)',
    required: false,
  })
  @IsOptional()
  @IsMongoId({ message: 'School ID must be a valid MongoDB ObjectId' })
  school_id?: string | Types.ObjectId;
}
