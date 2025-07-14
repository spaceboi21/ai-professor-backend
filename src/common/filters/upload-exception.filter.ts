import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Catch()
export class UploadExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Check if this is a file upload request that failed validation
    if (request.file && exception instanceof HttpException) {
      const file = request.file;
      const uploadDir = './uploads/bibliography';
      const filePath = path.join(uploadDir, file.filename);

      // Clean up the orphaned file
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up orphaned file: ${filePath}`);
        } catch (cleanupError) {
          console.error(`Failed to clean up file: ${filePath}`, cleanupError);
        }
      }
    }

    // Return the original error response
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const message = exception.getResponse();

      response.status(status).json({
        statusCode: status,
        message:
          typeof message === 'string' ? message : (message as any).message,
        error:
          typeof message === 'string' ? 'Bad Request' : (message as any).error,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    } else {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }
}
