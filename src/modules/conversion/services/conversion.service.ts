import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LibreOfficeDetectorService } from './libreoffice-detector.service';
import { FileManagerService } from './file-manager.service';
import { ConversionEngineService, ConversionResult } from './conversion-engine.service';

export interface ConversionResponse {
  success: boolean;
  message: string;
  fileName: string; // Primary PDF filename (for database storage)
  originalFileName: string; // Original PPT filename (for archival)
  slideCount: number;
  fileSize: number;
  originalFileSize: number;
  conversionMethod: string;
  conversionTime: number;
  fileUrl: string; // Primary PDF URL (for database storage)
  originalFileUrl: string; // Original PPT URL (for reference)
  url: string
}

@Injectable()
export class ConversionService {
  private readonly logger = new Logger(ConversionService.name);

  constructor(
    private configService: ConfigService,
    private libreOfficeDetector: LibreOfficeDetectorService,
    private fileManager: FileManagerService,
    private conversionEngine: ConversionEngineService,
  ) {}

  /**
   * Convert PPT to PDF directly with async processing
   */
  async convertPptToPdf(
    file: Express.Multer.File,
    userId?: string,
  ): Promise<ConversionResponse> {
    this.validateFile(file);

    // Check LibreOffice availability
    const libreOfficePath = await this.libreOfficeDetector.findLibreOffice();
    if (!libreOfficePath) {
      throw new InternalServerErrorException(
        'LibreOffice not found on this system. Please install LibreOffice.',
      );
    }

    const startTime = Date.now();
    let tempFile;
    
    try {
      this.logger.log(`🚀 Starting direct conversion for: ${file.originalname} by user: ${userId}`);

      // Create temporary file
      tempFile = await this.fileManager.createTempFile(file.buffer, file.originalname);

      // Convert to PDF in async manner but wait for completion
      const result = await this.performAsyncConversion(
        libreOfficePath,
        tempFile.inputPath,
        tempFile.outputDir,
      );

      // Save both original PPT and converted PDF to bibliography folder
      const savedFiles = await this.fileManager.saveBothFiles(
        file.buffer, 
        result.pdfBytes, 
        file.originalname
      );

      const totalTime = Date.now() - startTime;
      
      // Generate URLs for both files (PDF is primary for database)
      const fileUrl = this.generateFileUrl(savedFiles.pdfFileName);
      const originalFileUrl = this.generateFileUrl(savedFiles.pptFileName);

      const urlToStoreinDB = process.env.NODE_ENV === 'production' ? fileUrl : 'uploads/bibliography/' + savedFiles.pdfFileName;

      this.logger.log(`✅ Direct conversion completed in ${totalTime}ms`);
      this.logger.log(`📄 ${file.originalname} → ${savedFiles.pdfFileName} (${result.pageCount} slides)`);
      this.logger.log(`📁 Original stored: ${savedFiles.pptFileName}`);
      this.logger.log(`🔗 Primary PDF URL: ${fileUrl}`);

      return {
        success: true,
        message: `Successfully converted ${result.pageCount} slides to PDF`,
        fileName: savedFiles.pdfFileName,
        originalFileName: savedFiles.pptFileName,
        slideCount: result.pageCount,
        fileSize: result.fileSize,
        originalFileSize: file.size,
        conversionMethod: result.method,
        conversionTime: totalTime,
        fileUrl,
        originalFileUrl,
        url: urlToStoreinDB
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.logger.error(`❌ Direct conversion failed after ${totalTime}ms: ${error.message}`);
      throw new InternalServerErrorException(`Conversion failed: ${error.message}`);
    } finally {
      // Cleanup temporary files
      if (tempFile) {
        try {
          await tempFile.cleanup();
          this.logger.debug('✓ Cleaned up temporary files');
        } catch (cleanupError) {
          this.logger.warn(`⚠️ Cleanup warning: ${cleanupError.message}`);
        }
      }
    }
  }

  /**
   * Perform async conversion in separate thread context
   */
  private async performAsyncConversion(
    libreOfficePath: string,
    inputPath: string,
    outputDir: string,
  ): Promise<ConversionResult> {
    // Use process.nextTick to ensure this runs in next tick for better performance
    return new Promise((resolve, reject) => {
      process.nextTick(async () => {
        try {
          const result = await this.conversionEngine.convertPptToPdf(
            libreOfficePath,
            inputPath,
            outputDir,
          );
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Generate file URL based on environment
   */
  private generateFileUrl(fileName: string): string {
    const nodeEnv = process.env.NODE_ENV;
    
    if (nodeEnv === 'production') {
      // In production, return S3 URL (fileName already includes bibliography/ prefix)
      const bucketName = this.configService.get('AWS_S3_BUCKET_NAME');
      const region = this.configService.get('AWS_REGION');
      return `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`;
    } else {
      // In development, return local server URL to bibliography folder
      const port = this.configService.get('PORT') || 3000;
      return `${process.env.BACKEND_URL}/uploads/bibliography/${fileName}`;
    }
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<any> {
    const libreOfficePath = await this.libreOfficeDetector.findLibreOffice();
    const isValid = await this.libreOfficeDetector.validateLibreOffice();

    return {
      platform: process.platform,
      nodeVersion: process.version,
      nodeEnv: process.env.NODE_ENV,
      libreOffice: {
        found: !!libreOfficePath,
        path: libreOfficePath,
        valid: isValid,
      },
      config: {
        maxFileSize: this.configService.get('conversion.maxFileSize'),
        conversionTimeout: this.configService.get('conversion.conversionTimeout'),
        batchSize: this.configService.get('conversion.batchSize'),
        maxConcurrent: this.configService.get('conversion.maxConcurrentConversions'),
      },
    };
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedMimeTypes = this.configService.get<string[]>('conversion.allowedMimeTypes') || [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
    ];
    const allowedExtensions = this.configService.get<string[]>('conversion.allowedExtensions') || ['.ppt', '.pptx'];
    const maxFileSize = this.configService.get<number>('conversion.maxFileSize') || 50 * 1024 * 1024;

    // Check file size
    if (file.size > maxFileSize) {
      throw new BadRequestException(
        `File too large. Maximum size is ${Math.round(maxFileSize / 1024 / 1024)}MB`,
      );
    }

    // Check MIME type
    const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
    const isValidExtension = allowedExtensions.some(ext =>
      file.originalname.toLowerCase().endsWith(ext),
    );

    if (!isValidMimeType && !isValidExtension) {
      throw new BadRequestException('Only PowerPoint files (.ppt, .pptx) are allowed');
    }
  }


}
