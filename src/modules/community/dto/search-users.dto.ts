import { IsOptional, IsString, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { RoleEnum } from 'src/common/constants/roles.constant';

export class SearchUsersDto {
  @ApiProperty({
    description: 'Search term for first name, last name, or email',
    required: false,
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter by specific role (STUDENT or PROFESSOR only)',
    enum: [RoleEnum.STUDENT, RoleEnum.PROFESSOR],
    required: false,
    example: RoleEnum.STUDENT,
  })
  @IsOptional()
  @IsEnum([RoleEnum.STUDENT, RoleEnum.PROFESSOR])
  role?: RoleEnum;

  @ApiProperty({
    description: 'Page number for pagination',
    required: false,
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    default: 20,
    minimum: 1,
    maximum: 100,
    example: 20,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
} 