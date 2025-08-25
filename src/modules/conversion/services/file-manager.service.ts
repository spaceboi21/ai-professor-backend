import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface TempFileInfo {
  sessionId: string;
  inputPath: string;
  outputDir: string;
  cleanup: () => Promise<void>;
}

@Injectable()
export class FileManagerService {
  private readonly logger = new Logger(FileManagerService.name);
  private readonly uploadDir: string;
  private readonly tempDir: string;

  constructor(
    private configService: ConfigService,
  ) {
    this.uploadDir = this.configService.get<string>('conversion.uploadDir') || './uploads';
    this.tempDir = this.configService.get<string>('conversion.tempDir') || './temp';
    
    this.ensureDirectories();
    this.scheduleCleanup();
  }

  private ensureDirectories(): void {
    [this.uploadDir, this.tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.log(`Created directory: ${dir}`);
      }
    });
  }

  async createTempFile(buffer: Buffer, originalName: string): Promise<TempFileInfo> {
    const sessionId = uuidv4();
    const fileExtension = path.extname(originalName);
    const inputPath = path.join(this.tempDir, `temp-${sessionId}${fileExtension}`);
    const outputDir = path.join(this.tempDir, `slides-${sessionId}`);

    // Write buffer to temporary file
    fs.writeFileSync(inputPath, buffer);
    
    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    this.logger.debug(`Created temp file: ${inputPath}`);
    this.logger.debug(`Created output dir: ${outputDir}`);

    return {
      sessionId,
      inputPath,
      outputDir,
      cleanup: async () => this.cleanup(inputPath, outputDir),
    };
  }

  /**
   * Saves both original PPT and converted PDF to bibliography folder
   * Returns the PDF filename as primary (for database storage)
   */
  async saveBothFiles(
    originalBuffer: Buffer, 
    pdfBytes: Buffer, 
    originalName: string
  ): Promise<{ pdfFileName: string; pptFileName: string }> {
    const timestamp = Date.now();
    const baseName = path.parse(originalName).name;
    const originalExt = path.parse(originalName).ext;
    
    const pdfFileName = `${baseName}-${timestamp}.pdf`;
    const pptFileName = `${baseName}-${timestamp}${originalExt}`;

    // Check if running in production (use S3) or development (use local)
    const nodeEnv = process.env.NODE_ENV;
    
    if (nodeEnv === 'production') {
      try {
        // Upload both to S3 bibliography folder
        const pdfKey = await this.uploadToS3(pdfBytes, pdfFileName, 'application/pdf');
        const pptKey = await this.uploadToS3(originalBuffer, pptFileName, this.getPptMimeType(originalExt));
        
        this.logger.log(`Both files uploaded to S3 bibliography folder:`);
        this.logger.log(`- PDF: ${pdfKey} (${pdfBytes.length} bytes)`);
        this.logger.log(`- PPT: ${pptKey} (${originalBuffer.length} bytes)`);
        
        return { pdfFileName: pdfKey, pptFileName: pptKey };
      } catch (error) {
        this.logger.error(`Failed to upload to S3: ${error.message}`);
        // Fallback to local storage if S3 fails
        return this.saveBothToLocal(originalBuffer, pdfBytes, pptFileName, pdfFileName);
      }
    } else {
      // Save both locally in development
      return this.saveBothToLocal(originalBuffer, pdfBytes, pptFileName, pdfFileName);
    }
  }

  /**
   * Legacy method - now redirects to saveBothFiles for consistency
   * @deprecated Use saveBothFiles instead
   */
  async savePdf(pdfBytes: Buffer, originalName: string): Promise<string> {
    const timestamp = Date.now();
    const baseName = path.parse(originalName).name;
    const fileName = `${baseName}-${timestamp}.pdf`;

    // Check if running in production (use S3) or development (use local)
    const nodeEnv = process.env.NODE_ENV;
    
    if (nodeEnv === 'production') {
      try {
        const key = await this.uploadToS3(pdfBytes, fileName, 'application/pdf');
        this.logger.log(`PDF uploaded to S3: ${key} (${pdfBytes.length} bytes)`);
        return key;
      } catch (error) {
        this.logger.error(`Failed to upload to S3: ${error.message}`);
        return this.saveToLocal(pdfBytes, fileName);
      }
    } else {
      return this.saveToLocal(pdfBytes, fileName);
    }
  }

  private async uploadToS3(fileBytes: Buffer, fileName: string, contentType: string): Promise<string> {
    // Direct S3 upload using AWS SDK
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    
    const s3Client = new S3Client({
      region: this.configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });

    const timestamp = Date.now();
    const key = `bibliography/${timestamp}-${uuidv4()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: this.configService.get('AWS_S3_BUCKET_NAME'),
      Key: key,
      Body: fileBytes,
      ContentType: contentType,
      Metadata: {
        'original-name': fileName,
        'upload-timestamp': timestamp.toString(),
        'folder': 'bibliography',
      },
    });

    await s3Client.send(command);
    return key;
  }

  private saveToLocal(fileBytes: Buffer, fileName: string): string {
    const localDir = path.join(this.uploadDir, 'bibliography');
    
    // Ensure local directory exists
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    
    const filePath = path.join(localDir, fileName);
    fs.writeFileSync(filePath, fileBytes);
    
    this.logger.log(`File saved locally to bibliography: ${fileName} (${fileBytes.length} bytes)`);
    return fileName;
  }

  private saveBothToLocal(
    originalBuffer: Buffer,
    pdfBytes: Buffer,
    pptFileName: string,
    pdfFileName: string
  ): { pdfFileName: string; pptFileName: string } {
    const localDir = path.join(this.uploadDir, 'bibliography');
    
    // Ensure local directory exists
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    
    // Save both files
    const pdfPath = path.join(localDir, pdfFileName);
    const pptPath = path.join(localDir, pptFileName);
    
    fs.writeFileSync(pdfPath, pdfBytes);
    fs.writeFileSync(pptPath, originalBuffer);
    
    this.logger.log(`Both files saved locally to bibliography folder:`);
    this.logger.log(`- PDF: ${pdfFileName} (${pdfBytes.length} bytes)`);
    this.logger.log(`- PPT: ${pptFileName} (${originalBuffer.length} bytes)`);
    
    return { pdfFileName, pptFileName };
  }

  private getPptMimeType(extension: string): string {
    const ext = extension.toLowerCase();
    switch (ext) {
      case '.pptx':
        return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      case '.ppt':
        return 'application/vnd.ms-powerpoint';
      default:
        return 'application/octet-stream';
    }
  }

  private async cleanup(inputPath: string, outputDir: string): Promise<void> {
    try {
      if (fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
        this.logger.debug(`Cleaned temp file: ${inputPath}`);
      }

      if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true });
        this.logger.debug(`Cleaned temp directory: ${outputDir}`);
      }
    } catch (error) {
      this.logger.warn(`Cleanup warning: ${error.message}`);
    }
  }

  private scheduleCleanup(): void {
    const interval = this.configService.get<number>('conversion.cleanupInterval');
    
    setInterval(() => {
      this.cleanupOldFiles();
    }, interval);

    // Initial cleanup after 5 seconds
    setTimeout(() => this.cleanupOldFiles(), 5000);
  }

  private cleanupOldFiles(): void {
    try {
      const maxAge = this.configService.get<number>('conversion.tempFileMaxAge') || 3600000; // 1 hour default
      const cutoffTime = Date.now() - maxAge;
      
      if (!fs.existsSync(this.tempDir)) {
        return;
      }
      
      const tempFiles = fs.readdirSync(this.tempDir);

      tempFiles.forEach(file => {
        const filePath = path.join(this.tempDir, file);
        
        try {
          const stats = fs.statSync(filePath);

          if (stats.mtime.getTime() < cutoffTime) {
            if (stats.isDirectory()) {
              fs.rmSync(filePath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(filePath);
            }
            this.logger.debug(`Cleaned up old file: ${file}`);
          }
        } catch (error) {
          this.logger.warn(`Could not process ${file}: ${error.message}`);
        }
      });
    } catch (error) {
      this.logger.warn('Cleanup failed:', error.message);
    }
  }
}
