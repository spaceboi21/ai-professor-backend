import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform {
  transform(value: string): string {
    if (!isValidObjectId(value)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Invalid ID Format',
        message:
          'The ID provided is not in the correct format. Please use a valid MongoDB ObjectId.',
      });
    }
    return value;
  }
}
