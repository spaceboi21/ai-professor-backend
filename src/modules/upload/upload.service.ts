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
    // Security: Validate mime type based on folder
    if (folder === 'bibliography') {
      if (!this.BIBLIOGRAPHY_ALLOWED_MIME_TYPES.includes(mimeType)) {
        throw new BadRequestException(
          `Invalid bibliography file type. Allowed types: ${this.BIBLIOGRAPHY_ALLOWED_MIME_TYPES.join(', ')}`,
        );
      }
    } else {
      if (!this.ALLOWED_MIME_TYPES.includes(mimeType)) {
        throw new BadRequestException(
          `Invalid file type. Allowed types: ${this.ALLOWED_MIME_TYPES.join(', ')}`,
        );
      }
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

    const url = await getSignedUrl(this.s3Client, command, {
      expiresIn: 60 * 5,
    });
    return {
      uploadUrl: url,
      fileUrl: `https://${this.configService.get('AWS_S3_BUCKET_NAME')}.s3.amazonaws.com/${key}`,
    };
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
