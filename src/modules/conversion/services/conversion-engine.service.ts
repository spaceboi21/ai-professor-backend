import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PDFDocument } from 'pdf-lib';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface ConversionResult {
  pdfBytes: Buffer;
  pageCount: number;
  conversionTime: number;
  method: string;
  fileSize: number;
}

@Injectable()
export class ConversionEngineService {
  private readonly logger = new Logger(ConversionEngineService.name);

  constructor(private configService: ConfigService) {}

  async convertPptToPdf(
    libreOfficePath: string,
    inputPath: string,
    outputDir: string,
  ): Promise<ConversionResult> {
    const startTime = Date.now();

    try {
      // Try ultra-fast direct conversion first
      const result = await this.convertDirect(libreOfficePath, inputPath, outputDir);
      const conversionTime = Date.now() - startTime;

      this.logger.log(`✅ Ultra-fast conversion completed in ${conversionTime}ms`);
      this.logger.log(`📄 Pages: ${result.pageCount}`);

      return {
        pdfBytes: result.pdfBytes,
        pageCount: result.pageCount,
        conversionTime,
        method: 'LibreOffice-Direct (Ultra Fast)',
        fileSize: result.pdfBytes.length,
      };
    } catch (error) {
      this.logger.warn(`Fast conversion failed: ${error.message}, falling back to image method`);
      
      // Fallback to image-based conversion
      return this.convertWithImages(libreOfficePath, inputPath, outputDir, startTime);
    }
  }

  private async convertDirect(
    libreOfficePath: string,
    inputPath: string,
    outputDir: string,
  ): Promise<{ pdfBytes: Buffer; pageCount: number }> {
    const timeout = this.configService.get<number>('conversion.conversionTimeout');
    
    // Use --headless mode for background conversion and --norestore to avoid UI conflicts
    const convertCmd = `"${libreOfficePath}" --headless --norestore --convert-to pdf --outdir "${outputDir}" "${inputPath}"`;

    this.logger.debug(`Converting directly to PDF: ${convertCmd}`);

    const { stdout, stderr } = await execAsync(convertCmd, { 
      timeout,
      // Set environment variables to prevent LibreOffice from showing dialogs
      env: {
        ...process.env,
        SAL_USE_VCLPLUGIN: 'svp', // Use server virtual plugin for headless mode
        DISPLAY: ':0', // Set a display for X11 (Linux)
      }
    });

    if (stderr) {
      this.logger.debug(`LibreOffice stderr: ${stderr}`);
    }

    // Find the generated PDF
    const pdfFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.pdf'));

    if (pdfFiles.length === 0) {
      throw new Error('No PDF file was generated');
    }

    const pdfPath = path.join(outputDir, pdfFiles[0]);
    const pdfBytes = fs.readFileSync(pdfPath);

    // Get page count
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();

    return { pdfBytes, pageCount };
  }

  private async convertWithImages(
    libreOfficePath: string,
    inputPath: string,
    outputDir: string,
    startTime: number,
  ): Promise<ConversionResult> {
    this.logger.log('Using image-based conversion fallback...');

    // First convert to PDF
    const pdfOutputDir = path.join(outputDir, 'pdf-temp');
    if (!fs.existsSync(pdfOutputDir)) {
      fs.mkdirSync(pdfOutputDir, { recursive: true });
    }

    const timeout = this.configService.get<number>('conversion.conversionTimeout') || 300000;
    const convertToPdfCmd = `"${libreOfficePath}" --headless --norestore --convert-to pdf --outdir "${pdfOutputDir}" "${inputPath}"`;

    await execAsync(convertToPdfCmd, { 
      timeout: timeout / 2,
      env: {
        ...process.env,
        SAL_USE_VCLPLUGIN: 'svp',
        DISPLAY: ':0',
      }
    });

    const pdfFiles = fs.readdirSync(pdfOutputDir).filter(f => f.endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      throw new Error('No PDF file was generated in fallback method');
    }

    const pdfPath = path.join(pdfOutputDir, pdfFiles[0]);
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();

    // For fallback, we'll use the PDF directly for now
    // You can implement the full image conversion here if needed

    const conversionTime = Date.now() - startTime;

    // Cleanup temp PDF
    try {
      fs.unlinkSync(pdfPath);
      fs.rmdirSync(pdfOutputDir);
    } catch (error) {
      this.logger.warn('PDF cleanup warning:', error.message);
    }

    return {
      pdfBytes,
      pageCount,
      conversionTime,
      method: 'LibreOffice-Fallback',
      fileSize: pdfBytes.length,
    };
  }

  /**
   * Validates if the input file is a valid PowerPoint file
   */
  validatePptFile(filePath: string): boolean {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    const ext = path.extname(filePath).toLowerCase();
    return ['.ppt', '.pptx'].includes(ext);
  }

  /**
   * Gets estimated conversion time based on file size
   */
  getEstimatedConversionTime(fileSize: number): number {
    // Rough estimate: 1MB = ~3 seconds, minimum 2 seconds
    const basetime = 2000; // 2 seconds minimum
    const sizeTime = (fileSize / (1024 * 1024)) * 3000; // 3 seconds per MB
    return Math.max(basetime, sizeTime);
  }
}
