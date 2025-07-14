import { PartialType } from '@nestjs/swagger';
import { CreateQuizGroupDto } from './create-quiz-group.dto';

export class UpdateQuizGroupDto extends PartialType(CreateQuizGroupDto) {} 