import { ApiProperty } from '@nestjs/swagger';

export class ConversionRequestDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'PowerPoint file to convert (.ppt or .pptx)',
  })
  pptFile: Express.Multer.File;
}

export class ConversionStatusDto {
  @ApiProperty({
    description: 'Session ID of the conversion job',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  sessionId: string;
}
