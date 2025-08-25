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
   * Strip HTML tags from text content
   */
  private stripHtmlTags(text: string): string {
    if (!text || typeof text !== 'string') {
      return text;
    }

    // Remove HTML tags and decode HTML entities
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Replace encoded ampersands
      .replace(/&lt;/g, '<') // Replace encoded less than
      .replace(/&gt;/g, '>') // Replace encoded greater than
      .replace(/&quot;/g, '"') // Replace encoded quotes
      .replace(/&#39;/g, "'") // Replace encoded apostrophes
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .trim(); // Remove leading/trailing whitespace
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: Record<string, any>[], headers: string[]): string {
    // Escape and format CSV values
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) {
        return '';
      }

      let stringValue = String(value);

      // Strip HTML tags from the value
      stringValue = this.stripHtmlTags(stringValue);

      // If the value contains comma, quote, or newline, wrap it in quotes
      if (
        stringValue.includes(',') ||
        stringValue.includes('"') ||
        stringValue.includes('\n')
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }

      return stringValue;
    };

    // Create CSV header row
    const headerRow = headers.map((header) => escapeCSV(header)).join(',');

    // Create CSV data rows
    const dataRows = data.map((row) => {
      return headers.map((header) => escapeCSV(row[header])).join(',');
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
  async getFileContent(
    filename: string,
  ): Promise<{ content: Buffer; contentType: string }> {
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
