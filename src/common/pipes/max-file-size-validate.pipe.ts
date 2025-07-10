import { Injectable, FileValidator } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import 'multer';

@Injectable()
export class MaxFileSizeValidator extends FileValidator {
  private readonly maxSize: number;

  constructor(private readonly configService: ConfigService) {
    super({});
    const maxFileSizeMB = parseInt(
      configService.get<string>('MAXIMUM_FILE_SIZE') || '5',
    );
    this.maxSize = maxFileSizeMB * 1024 * 1024; // Convert MB to bytes
  }

  isValid(file?: Express.Multer.File): boolean {
    if (!file) return true;
    return file.size <= this.maxSize;
  }

  buildErrorMessage(): string {
    return `File size should not exceed ${this.maxSize / (1024 * 1024)} MB`;
  }
}
