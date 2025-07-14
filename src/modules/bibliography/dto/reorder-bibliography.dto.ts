import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Types } from 'mongoose';

export class ReorderBibliographyDto {
  @IsMongoId({ message: 'Bibliography ID must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Bibliography ID is required' })
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the bibliography item to reorder',
  })
  bibliography_id: string | Types.ObjectId;

  @IsNumber({}, { message: 'New sequence must be a number' })
  @Min(1, { message: 'New sequence must be at least 1' })
  @IsNotEmpty({ message: 'New sequence is required' })
  @ApiProperty({
    example: 3,
    description: 'New sequence number for the bibliography item',
  })
  new_sequence: number;
}

export class ReorderBibliographyItemsDto {
  @ApiProperty({
    type: [ReorderBibliographyDto],
    description: 'Array of bibliography items with their new sequence numbers',
    example: [
      {
        bibliography_id: '507f1f77bcf86cd799439011',
        new_sequence: 1,
      },
      {
        bibliography_id: '507f1f77bcf86cd799439012',
        new_sequence: 2,
      },
    ],
  })
  @IsArray({ message: 'Bibliography items must be an array' })
  @ValidateNested({ each: true })
  @Type(() => ReorderBibliographyDto)
  bibliography_items: ReorderBibliographyDto[];
}
