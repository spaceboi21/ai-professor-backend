import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { UploadFolders } from 'src/common/types/upload-folders.type';
import { Readable } from 'stream';

@Injectable()
export class UploadService {
  private readonly s3Client: S3Client;

  // Security: Define allowed file types and sizes
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  // Bibliography file types - updated to match controller
  private readonly BIBLIOGRAPHY_ALLOWED_MIME_TYPES = [
    'application/pdf',
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/flv',
    'video/webm',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];

  // Forum attachment file types
  private readonly FORUM_ATTACHMENT_ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'text/plain',
    'text/csv',
  ];

  constructor(private readonly configService: ConfigService) {
    if (this.configService.get('NODE_ENV') === 'production') {
      this.s3Client = new S3Client({
        region: this.configService.get('AWS_REGION'),
        credentials: {
          accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID')!,
          secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY')!,
        },
      });
    }
  }

  async generateS3UploadUrl(
    folder: UploadFolders,
    fileName: string,
    mimeType: string,
  ) {
    try {
      // Security: Validate mime type based on folder
      if (folder === 'bibliography') {
        if (!this.BIBLIOGRAPHY_ALLOWED_MIME_TYPES.includes(mimeType)) {
          throw new BadRequestException(
            `Invalid bibliography file type. Allowed types: ${this.BIBLIOGRAPHY_ALLOWED_MIME_TYPES.join(', ')}`,
          );
        }
      } else if (folder === 'forum-attachments') {
        if (!this.FORUM_ATTACHMENT_ALLOWED_MIME_TYPES.includes(mimeType)) {
          throw new BadRequestException(
            `Invalid forum attachment file type. Allowed types: ${this.FORUM_ATTACHMENT_ALLOWED_MIME_TYPES.join(', ')}`,
          );
        }
      } else {
        if (!this.ALLOWED_MIME_TYPES.includes(mimeType)) {
          throw new BadRequestException(
            `Invalid file type. Allowed types: ${this.ALLOWED_MIME_TYPES.join(', ')}`,
          );
        }
      }

      // Check if S3 client is available
      if (!this.s3Client) {
        throw new BadRequestException(
          'S3 client not available. Please check AWS configuration.',
        );
      }

      // Security: Sanitize filename
      const sanitizedFileName = this.sanitizeFileName(fileName);

      // Security: Generate secure key with timestamp
      const timestamp = Date.now();
      const key = `${folder}/${timestamp}-${randomUUID()}-${sanitizedFileName}`;

      const command = new PutObjectCommand({
        Bucket: this.configService.get('AWS_S3_BUCKET_NAME')!,
        Key: key,
        ContentType: mimeType,
      });

      const expiresIn = 60 * 5; // 5 minutes
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      // Get max file size based on folder
      let maxSize = 5 * 1024 * 1024; // Default 5MB
      if (folder === 'bibliography') {
        maxSize =
          (this.configService.get<number>('MAXIMUM_BIBLIOGRAPHY_FILE_SIZE') ??
            100) *
          1024 *
          1024;
      } else if (folder === 'forum-attachments') {
        maxSize =
          (this.configService.get<number>(
            'MAXIMUM_FORUM_ATTACHMENT_FILE_SIZE',
          ) ?? 10) *
          1024 *
          1024;
      }

      return {
        uploadUrl: url,
        fileUrl: `https://${this.configService.get('AWS_S3_BUCKET_NAME')}.s3.amazonaws.com/${key}`,
        expiresIn,
        maxSize,
      };
    } catch (error) {
      // Log the error for debugging
      console.error('Error generating S3 upload URL:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      // Handle S3-specific errors
      if (
        error.name === 'InvalidAccessKeyId' ||
        error.name === 'UnauthorizedOperation'
      ) {
        throw new BadRequestException(
          'AWS credentials are invalid or insufficient permissions. Please check AWS configuration.',
        );
      }

      if (error.name === 'NoSuchBucket') {
        throw new BadRequestException(
          'S3 bucket not found. Please check AWS S3 bucket configuration.',
        );
      }

      // Generic error for other S3 issues
      throw new BadRequestException(
        `Failed to generate upload URL: ${error.message || 'Unknown error occurred'}`,
      );
    }
  }

  // New method to process file buffer with proper error handling
  async processFileBuffer(
    stream: Readable,
    filePath: string,
    maxSize: number = 100 * 1024 * 1024, // 100MB default
  ): Promise<{ buffer: Buffer; size: number }> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let totalSize = 0;

      stream.on('data', (chunk: Buffer) => {
        totalSize += chunk.length;

        // Check file size limit
        if (totalSize > maxSize) {
          reject(
            new BadRequestException(
              `File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB`,
            ),
          );
          return;
        }

        chunks.push(chunk);
      });

      stream.on('end', () => {
        if (totalSize === 0) {
          reject(new BadRequestException('Empty file received'));
          return;
        }

        const buffer = Buffer.concat(chunks);
        resolve({ buffer, size: totalSize });
      });

      stream.on('error', (error) => {
        reject(new BadRequestException(`File upload failed: ${error.message}`));
      });
    });
  }

  // Validate file content type
  validateContentType(contentType: string, allowedTypes: string[]): boolean {
    if (!contentType) return false;
    return allowedTypes.includes(contentType);
  }

  private sanitizeFileName(fileName: string): string {
    // Security: Remove potentially dangerous characters
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }
}
