import { registerAs } from '@nestjs/config';

export default registerAs('conversion', () => ({
  // File handling
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '524288000') || 500 * 1024 * 1024, // 500MB
  allowedMimeTypes: [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
  ],
  allowedExtensions: ['.ppt', '.pptx'],

  // Timeouts
  conversionTimeout: parseInt(process.env.CONVERSION_TIMEOUT || '300000') || 300000, // 5 minutes
  tempFileMaxAge: parseInt(process.env.TEMP_FILE_MAX_AGE || '3600000') || 60 * 60 * 1000, // 1 hour
  cleanupInterval: parseInt(process.env.TEMP_CLEANUP_INTERVAL || '1800000') || 30 * 60 * 1000, // 30 min

    // LibreOffice
  libreOfficePath: process.env.LIBREOFFICE_PATH || null,
  requireLibreOffice: process.env.REQUIRE_LIBREOFFICE !== 'false', // Default to true, can be disabled with REQUIRE_LIBREOFFICE=false

  // Performance
  batchSize: parseInt(process.env.BATCH_SIZE || '5') || 5,
  maxConcurrentConversions: parseInt(process.env.MAX_CONCURRENT || '3') || 3,

  // Rate limiting
  rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL || '900') || 15 * 60, // 15 minutes
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '10') || 10,

  // Directories
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  tempDir: process.env.TEMP_DIR || './temp',
}));
