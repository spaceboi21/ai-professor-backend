import { PartialType } from '@nestjs/swagger';
import { CreateAnchorTagDto } from './create-anchor-tag.dto';

export class UpdateAnchorTagDto extends PartialType(CreateAnchorTagDto) {}
