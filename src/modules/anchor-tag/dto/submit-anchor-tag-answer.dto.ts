import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsMongoId,
  IsArray,
  IsString,
  ValidateIf,
} from 'class-validator';
import { Types } from 'mongoose';

export class SubmitAnchorTagAnswerDto {
  @ValidateIf((o) => !o.text_response)
  @IsMongoId({ message: 'Quiz ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ApiProperty({
    example: '507f1f77bcf86cd799439015',
    description:
      'ID of the quiz question (required if not providing text response)',
    required: false,
  })
  quiz_id?: string | Types.ObjectId;

  @ValidateIf((o) => o.quiz_id)
  @IsArray({ message: 'Selected answers must be an array' })
  @IsString({ each: true, message: 'Each selected answer must be a string' })
  @IsOptional()
  @ApiProperty({
    example: ['Active listening', 'Empathy'],
    description: 'Array of selected answers for quiz questions',
    type: [String],
    required: false,
  })
  selected_answers?: string[];

  @ValidateIf((o) => !o.quiz_id)
  @IsString({ message: 'Text response must be a string' })
  @IsOptional()
  @ApiProperty({
    example:
      'Active listening involves paying full attention to the speaker and showing empathy through verbal and non-verbal cues.',
    description:
      'Text response for text-based questions (required if not providing quiz answer)',
    required: false,
  })
  text_response?: string;
}
