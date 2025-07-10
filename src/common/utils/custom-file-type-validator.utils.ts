import { FileTypeValidator, FileTypeValidatorOptions } from '@nestjs/common';

export class CustomFileTypeValidator extends FileTypeValidator {
  private readonly errorMessage: string;

  constructor(options: FileTypeValidatorOptions & { errorMessage?: string }) {
    super(options);
    this.errorMessage = options.errorMessage || 'Invalid file type';
  }

  buildErrorMessage(): string {
    return this.errorMessage;
  }
}
