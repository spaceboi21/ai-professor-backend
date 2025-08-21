import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';

export enum MemberRoleEnum {
  STUDENT = 'STUDENT',
  PROFESSOR = 'PROFESSOR',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
}

export class SchoolMembersFilterDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'john',
    description: 'Search term for name or email',
    required: false,
  })
  search?: string;

  @IsOptional()
  @IsEnum(MemberRoleEnum)
  @ApiProperty({
    example: MemberRoleEnum.STUDENT,
    enum: MemberRoleEnum,
    description: 'Filter by member role',
    required: false,
  })
  role?: MemberRoleEnum;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: '10',
    description: 'Limit number of results (default: 50, max: 100)',
    required: false,
  })
  limit?: string;
}
