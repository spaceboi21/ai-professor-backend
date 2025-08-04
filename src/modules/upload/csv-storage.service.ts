import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface CSVStorageOptions {
  filename: string;
  content: string;
  includeTimestamp?: boolean;
}

export interface CSVStorageResult {
  fileUrl: string;
  filePath?: string;
  filename: string;
  size: number;
  storageType: 'local' | 's3';
}

@Injectable()
export class CSVStorageService {
  private readonly logger = new Logger(CSVStorageService.name);
  private readonly s3Client: S3Client | null = null;
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.get('NODE_ENV') === 'production';
    
    if (this.isProduction) {
      this.s3Client = new S3Client({
        region: this.configService.get('AWS_REGION'),
        credentials: {
          accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID')!,
          secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY')!,
        },
      });
    }
  }

  /**
   * Store CSV file either locally or in S3 based on environment
   */
  async storeCSV(options: CSVStorageOptions): Promise<CSVStorageResult> {
    const { filename, content, includeTimestamp = true } = options;

    // Generate filename with timestamp if requested
    let finalFilename = filename;
    if (includeTimestamp) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      finalFilename = `${finalFilename}_${timestamp}`;
    }
    finalFilename = `${finalFilename}.csv`;

    if (this.isProduction) {
      return this.storeInS3(finalFilename, content);
    } else {
      return this.storeLocally(finalFilename, content);
    }
  }

  /**
   * Store CSV file locally in uploads/csv folder
   */
  private async storeLocally(filename: string, content: string): Promise<CSVStorageResult> {
    // Create uploads directory structure
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const csvDir = path.join(uploadsDir, 'csv');
    
    // Ensure directories exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(csvDir)) {
      fs.mkdirSync(csvDir, { recursive: true });
    }

    const filePath = path.join(csvDir, filename);
    
    // Write file
    fs.writeFileSync(filePath, content, 'utf8');
    
    // Get file size
    const stats = fs.statSync(filePath);
    const size = stats.size;

    this.logger.log(`CSV stored locally: ${filePath}, Size: ${size} bytes`);

    return {
      fileUrl: `/uploads/csv/${filename}`,
      filePath,
      filename,
      size,
      storageType: 'local',
    };
  }

  /**
   * Store CSV file in S3
   */
  private async storeInS3(filename: string, content: string): Promise<CSVStorageResult> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    const bucketName = this.configService.get('AWS_S3_BUCKET_NAME');
    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET_NAME not configured');
    }

    const key = `csv-exports/${filename}`;
    const buffer = Buffer.from(content, 'utf8');

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: 'text/csv',
      ContentDisposition: `attachment; filename="${filename}"`,
    });

    try {
      await this.s3Client.send(command);
      
      this.logger.log(`CSV stored in S3: ${key}, Size: ${buffer.length} bytes`);

      return {
        fileUrl: `https://${bucketName}.s3.amazonaws.com/${key}`,
        filename,
        size: buffer.length,
        storageType: 's3',
      };
    } catch (error) {
      this.logger.error(`Failed to upload CSV to S3: ${error.message}`);
      throw new Error(`Failed to upload CSV to S3: ${error.message}`);
    }
  }

  /**
   * Get file content for download
   */
  async getFileContent(filename: string): Promise<{ content: Buffer; contentType: string }> {
    if (this.isProduction) {
      return this.getFromS3(filename);
    } else {
      return this.getFromLocal(filename);
    }
  }

  /**
   * Get file content from local storage
   */
  private async getFromLocal(filename: string): Promise<{ content: Buffer; contentType: string }> {
    const csvDir = path.join(process.cwd(), 'uploads', 'csv');
    const filePath = path.join(csvDir, filename);

    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    const content = fs.readFileSync(filePath);
    return {
      content,
      contentType: 'text/csv',
    };
  }

  /**
   * Get file content from S3
   */
  private async getFromS3(filename: string): Promise<{ content: Buffer; contentType: string }> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    const bucketName = this.configService.get('AWS_S3_BUCKET_NAME');
    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET_NAME not configured');
    }

    const key = `csv-exports/${filename}`;

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    try {
      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('No content received from S3');
      }

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      const stream = response.Body as any;
      
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => {
          const content = Buffer.concat(chunks);
          resolve({
            content,
            contentType: response.ContentType || 'text/csv',
          });
        });
        stream.on('error', reject);
      });
    } catch (error) {
      this.logger.error(`Failed to download CSV from S3: ${error.message}`);
      throw new Error(`Failed to download CSV from S3: ${error.message}`);
    }
  }

  /**
   * Generate signed URL for S3 download (for production)
   */
  async generateDownloadUrl(filename: string): Promise<string> {
    if (!this.isProduction) {
      // For local development, return a relative path
      return filename;
    }

    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    const bucketName = this.configService.get('AWS_S3_BUCKET_NAME');
    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET_NAME not configured');
    }

    const key = `csv-exports/${filename}`;
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    try {
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: 60 * 60, // 1 hour
      });
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate S3 download URL: ${error.message}`);
      throw new Error(`Failed to generate S3 download URL: ${error.message}`);
    }
  }

  /**
   * Clean up old CSV files (local only)
   */
  async cleanupOldFiles(maxAgeHours: number = 24): Promise<void> {
    if (this.isProduction) {
      // S3 cleanup would require lifecycle policies or manual cleanup
      this.logger.log('S3 cleanup not implemented - use lifecycle policies');
      return;
    }

    const csvDir = path.join(process.cwd(), 'uploads', 'csv');
    if (!fs.existsSync(csvDir)) {
      return;
    }

    const files = fs.readdirSync(csvDir);
    const now = Date.now();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

    for (const file of files) {
      if (file.endsWith('.csv')) {
        const filePath = path.join(csvDir, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtime.getTime();

        if (age > maxAgeMs) {
          try {
            fs.unlinkSync(filePath);
            this.logger.log(`Cleaned up old CSV file: ${file}`);
          } catch (error) {
            this.logger.error(`Failed to cleanup file ${file}: ${error.message}`);
          }
        }
      }
    }
  }
} 