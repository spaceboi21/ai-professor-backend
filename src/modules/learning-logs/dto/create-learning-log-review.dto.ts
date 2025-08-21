import { IsNotEmpty, IsNumber, IsString, Min, Max, MaxLength, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLearningLogReviewDto {
  @ApiProperty({
    description: 'Rating given by the reviewer (1-5 stars)',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    description: 'Feedback/comment given by the reviewer',
    example: 'Great communication skills demonstrated. Shows good understanding of patient care principles.',
    maxLength: 1000,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  feedback: string;

  @ApiProperty({
    description: 'Additional metadata for the review',
    example: { strengths: ['communication', 'empathy'], areas_for_improvement: ['documentation'] },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
} 