import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { LanguageEnum } from 'src/common/constants/language.constant';

export class UpdatePreferredLanguageDto {
  @IsNotEmpty({ message: 'Preferred language is required' })
  @IsEnum(LanguageEnum, {
    message: 'Preferred language must be either "en" or "fr"',
  })
  @ApiProperty({
    description: 'Preferred language for the user interface',
    enum: LanguageEnum,
    example: LanguageEnum.FRENCH,
  })
  preferred_language: LanguageEnum;
}
