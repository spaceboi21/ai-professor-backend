import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEmail,
  IsNumber,
  IsUrl,
  IsIn,
} from 'class-validator';

export class UpdateSchoolDetailsDto {
  @IsOptional()
  @IsString({ message: 'School name must be a string' })
  @ApiProperty({ example: 'Springfield High', required: false })
  school_name?: string;

  @IsOptional()
  @IsString({ message: 'Address must be a string' })
  @ApiProperty({
    example: '742 Evergreen Terrace, Springfield',
    required: false,
  })
  address?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Website URL must be a valid URL' })
  @ApiProperty({ example: 'https://springfieldhigh.edu', required: false })
  school_website_url?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Phone must be a number' })
  @ApiProperty({ example: 1234567890, required: false })
  phone?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Country code must be a number' })
  @ApiProperty({ example: 91, required: false })
  country_code?: number;

  @IsOptional()
  @IsString({ message: 'Timezone must be a string' })
  @ApiProperty({ example: 'Asia/Kolkata', required: false })
  timezone?: string;

  @IsOptional()
  @IsString({ message: 'Language must be a string' })
  @ApiProperty({ example: 'en', required: false })
  language?: string;

  @IsOptional()
  @IsString({ message: 'logo must be a string' })
  @ApiProperty({ example: '/logo.png', required: false })
  logo?: string;
}
