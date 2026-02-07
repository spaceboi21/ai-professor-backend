import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CheckMultipleAccountsDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class SelectAccountDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Selected account ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  account_id: string;

  @ApiProperty({
    description: 'Password for authentication',
    example: 'SecurePassword123!',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class AccountListItemDto {
  @ApiProperty()
  account_id: string;

  @ApiProperty()
  school_name: string;

  @ApiProperty()
  school_id: string;

  @ApiProperty()
  role_name: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  account_code: string;

  @ApiProperty()
  first_name: string;

  @ApiProperty()
  last_name: string;

  @ApiProperty()
  status: string;
}

export class MultipleAccountsResponseDto {
  @ApiProperty()
  has_multiple_accounts: boolean;

  @ApiProperty()
  accounts_count: number;

  @ApiProperty({ type: [AccountListItemDto] })
  accounts: AccountListItemDto[];
}
