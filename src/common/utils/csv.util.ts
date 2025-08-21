import { Injectable } from '@nestjs/common';
import { CSVStorageService } from '../../modules/upload/csv-storage.service';

export interface CSVExportOptions {
  filename?: string;
  headers: string[];
  data: Record<string, any>[];
  includeTimestamp?: boolean;
}

@Injectable()
export class CSVUtil {
  constructor(private readonly csvStorageService: CSVStorageService) {}

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: Record<string, any>[], headers: string[]): string {
    // Escape and format CSV values
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) {
        return '';
      }

      const stringValue = String(value);

      // If the value contains comma, quote, or newline, wrap it in quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }

      return stringValue;
    };

    // Create CSV header row
    const headerRow = headers.map(header => escapeCSV(header)).join(',');

    // Create CSV data rows
    const dataRows = data.map(row => {
      return headers.map(header => escapeCSV(row[header])).join(',');
    });

    return [headerRow, ...dataRows].join('\n');
  }

  /**
   * Generate CSV file using the storage service
   */
  async generateCSVFile(options: CSVExportOptions): Promise<string> {
    const { filename, headers, data, includeTimestamp = true } = options;

    // Generate CSV content
    const csvContent = this.convertToCSV(data, headers);

    // Store using the storage service
    const result = await this.csvStorageService.storeCSV({
      filename: filename || 'export',
      content: csvContent,
      includeTimestamp,
    });

    // Return the file path for local storage or filename for S3
    return result.storageType === 'local' ? result.filePath! : result.filename;
  }

  /**
   * Get file content for download
   */
  async getFileContent(filename: string): Promise<{ content: Buffer; contentType: string }> {
    return this.csvStorageService.getFileContent(filename);
  }

  /**
   * Generate download URL
   */
  async generateDownloadUrl(filename: string): Promise<string> {
    return this.csvStorageService.generateDownloadUrl(filename);
  }

  /**
   * Get file size in bytes
   */
  getFileSize(filePath: string): number {
    try {
      const fs = require('fs');
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Clean up old CSV files
   */
  async cleanupOldFiles(maxAgeHours: number = 24): Promise<void> {
    return this.csvStorageService.cleanupOldFiles(maxAgeHours);
  }
} 