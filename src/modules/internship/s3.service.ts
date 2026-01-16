import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';

export interface S3UploadResult {
  s3_key: string;
  s3_url: string;
  public_url: string;
  bucket: string;
  region: string;
}

export interface DocumentMetadata {
  name: string;
  type: string;
  size?: number;
  case_id: string;
}

@Injectable()
export class InternshipS3Service {
  private readonly logger = new Logger(InternshipS3Service.name);
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  // Allowed file types for case documents
  private readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  // Max file size: 50MB
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME') || '';

    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    if (!this.bucketName || !accessKeyId || !secretAccessKey) {
      this.logger.warn('AWS S3 credentials not fully configured. S3 features will be disabled.');
      return;
    }

    // Initialize S3 Client
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log(`S3 Service initialized for bucket: ${this.bucketName} in region: ${this.region}`);
  }

  /**
   * Check if S3 is properly configured
   */
  isConfigured(): boolean {
    return !!this.bucketName && !!this.s3Client;
  }

  /**
   * Validate file type and size
   */
  private validateFile(mimeType: string, size?: number): void {
    if (!this.ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException(
        `Invalid file type: ${mimeType}. Allowed types: ${this.ALLOWED_MIME_TYPES.join(', ')}`
      );
    }

    if (size && size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size ${size} bytes exceeds maximum allowed size of ${this.MAX_FILE_SIZE} bytes (${this.MAX_FILE_SIZE / (1024 * 1024)}MB)`
      );
    }
  }

  /**
   * Generate S3 key for case document
   * Pattern: internship-cases/{case_id}/{timestamp}_{uuid}_{filename}
   */
  private generateS3Key(caseId: string, filename: string): string {
    const timestamp = Date.now();
    const uniqueId = uuid();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `internship-cases/${caseId}/${timestamp}_${uniqueId}_${sanitizedFilename}`;
  }

  /**
   * Get public S3 URL (for ingestion by Python AI)
   */
  private getPublicS3Url(s3Key: string): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${s3Key}`;
  }

  /**
   * Upload document to S3
   * @param buffer File buffer
   * @param metadata Document metadata
   * @returns Upload result with S3 URLs
   */
  async uploadDocument(
    buffer: Buffer,
    metadata: DocumentMetadata,
  ): Promise<S3UploadResult> {
    if (!this.isConfigured()) {
      throw new BadRequestException('S3 is not configured. Please contact administrator.');
    }

    // Validate file
    this.validateFile(metadata.type, buffer.length);

    // Generate S3 key
    const s3Key = this.generateS3Key(metadata.case_id, metadata.name);

    try {
      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: buffer,
        ContentType: metadata.type,
        Metadata: {
          case_id: metadata.case_id,
          original_name: metadata.name,
          uploaded_at: new Date().toISOString(),
        },
        // Make it private - use presigned URLs for access
        ACL: 'private',
      });

      await this.s3Client.send(command);

      const publicUrl = this.getPublicS3Url(s3Key);

      this.logger.log(`Document uploaded successfully: ${s3Key}`);

      return {
        s3_key: s3Key,
        s3_url: `s3://${this.bucketName}/${s3Key}`,
        public_url: publicUrl,
        bucket: this.bucketName,
        region: this.region,
      };
    } catch (error) {
      this.logger.error(`Failed to upload document to S3: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to upload document: ${error.message}`);
    }
  }

  /**
   * Generate presigned URL for document access (1 hour expiration)
   * @param s3Key S3 object key
   * @param expiresIn Expiration time in seconds (default: 3600 = 1 hour)
   * @returns Presigned URL
   */
  async getPresignedUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
    if (!this.isConfigured()) {
      throw new BadRequestException('S3 is not configured. Please contact administrator.');
    }

    try {
      // Check if object exists
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      await this.s3Client.send(headCommand);

      // Generate presigned URL
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

      this.logger.log(`Generated presigned URL for: ${s3Key} (expires in ${expiresIn}s)`);

      return presignedUrl;
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL: ${error.message}`, error.stack);
      
      if (error.name === 'NotFound') {
        throw new BadRequestException('Document not found in S3');
      }
      
      throw new BadRequestException(`Failed to generate download URL: ${error.message}`);
    }
  }

  /**
   * Delete document from S3
   * @param s3Key S3 object key
   */
  async deleteDocument(s3Key: string): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn('S3 not configured, skipping delete');
      return;
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      await this.s3Client.send(command);

      this.logger.log(`Document deleted from S3: ${s3Key}`);
    } catch (error) {
      this.logger.error(`Failed to delete document from S3: ${error.message}`, error.stack);
      // Don't throw error - deletion failure shouldn't block operations
    }
  }

  /**
   * Delete all documents for a case
   * @param caseId Case ID
   */
  async deleteCaseDocuments(caseId: string): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn('S3 not configured, skipping delete');
      return;
    }

    // Note: This is a simplified version
    // For production, you'd want to list all objects with prefix and delete them
    this.logger.log(`Delete all documents for case: ${caseId}`);
    // Implementation would require ListObjectsV2Command to find all documents
    // and then delete them individually or using DeleteObjectsCommand
  }

  /**
   * Extract S3 key from various URL formats
   * @param url S3 URL (s3://bucket/key or https://bucket.s3.region.amazonaws.com/key)
   * @returns S3 key
   */
  extractS3Key(url: string): string | null {
    if (!url) return null;

    // Handle s3:// URLs
    if (url.startsWith('s3://')) {
      const parts = url.replace('s3://', '').split('/');
      parts.shift(); // Remove bucket name
      return parts.join('/');
    }

    // Handle https:// URLs
    if (url.includes('.s3.') && url.includes('.amazonaws.com/')) {
      const urlObj = new URL(url);
      return urlObj.pathname.substring(1); // Remove leading slash
    }

    // Already a key
    return url;
  }
}

