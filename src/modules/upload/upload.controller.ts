import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
  UseFilters,
  Get,
  Query,
  Put,
  Req,
  Res,
  Param,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { v4 as uuid } from 'uuid';
import { GetFileUploadUrl } from './dto/get-upload-url.dto';
import { GetBibliographyUploadUrl } from './dto/get-bibliography-upload-url.dto';
import { GetThumbnailUploadUrl } from './dto/get-thumbnail-upload-url.dto';
import { GetForumAttachmentUploadUrl } from './dto/get-forum-attachment-upload-url.dto';
import { UploadService } from './upload.service';
import { ConfigService } from '@nestjs/config';
import { existsSync, writeFileSync } from 'fs';
import { mkdirSync } from 'fs';
import { UploadExceptionFilter } from 'src/common/filters/upload-exception.filter';
import { extname } from 'path';
import { Request, Response } from 'express';

const allowedImageTypes = ['.jpg', '.jpeg', '.png', '.webp'];
const allowedBibliographyTypes = [
  '.pdf',
  '.mp4',
  '.avi',
  '.mov',
  '.wmv',
  '.flv',
  '.webm',
  '.ppt',
  '.pptx',
];

function fileFilterForProfile(req, file, cb) {
  const ext = extname(file.originalname).toLowerCase();
  if (allowedImageTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestException('Only image files (JPEG, PNG, WebP) are allowed'),
      false,
    );
  }
}

function fileFilterForBibliography(req, file, cb) {
  const ext = extname(file.originalname).toLowerCase();
  if (allowedBibliographyTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestException(
        'Only PDF, video files (MP4, AVI, MOV, WMV, FLV, WebM), and PowerPoint files (PPT, PPTX) are allowed',
      ),
      false,
    );
  }
}

/**
 * Helper function to get max file size based on environment and file type
 */
function getMaxFileSize(configService: ConfigService, fileType: 'general' | 'bibliography' | 'forum'): number {
  // In production, allow unlimited file size
  if (process.env.NODE_ENV === 'production') {
    return Number.MAX_SAFE_INTEGER;
  }
  
  // In development, use configured limits
  switch (fileType) {
    case 'bibliography':
      return (configService.get<number>('MAXIMUM_BIBLIOGRAPHY_FILE_SIZE') ?? 100) * 1024 * 1024;
    case 'forum':
      return (configService.get<number>('MAXIMUM_FILE_SIZE') ?? 10) * 1024 * 1024;
    default:
      return (configService.get<number>('MAXIMUM_FILE_SIZE') ?? 5) * 1024 * 1024;
  }
}

@Controller('upload')
@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseFilters(UploadExceptionFilter)
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
  ) {}

  @Post('profile-url')
  @ApiOperation({
    summary: 'Generate a secure presigned upload URL for profile pictures',
    description:
      'Returns a temporary upload URL that expires in 5 minutes. File size limit: 5MB.',
  })
  @ApiBody({ type: GetFileUploadUrl })
  @ApiResponse({
    status: 200,
    description: 'Upload URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        uploadUrl: { type: 'string', description: 'Presigned upload URL' },
        fileUrl: { type: 'string', description: 'Final file URL after upload' },
        expiresIn: {
          type: 'number',
          description: 'URL expiry time in seconds',
        },
        maxSize: { type: 'number', description: 'Maximum file size in bytes' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or missing parameters',
  })
  async getProfileUploadUrl(@Body() data: GetFileUploadUrl) {
    const { fileName, mimeType } = data;

    if (this.configService.get('NODE_ENV') === 'production') {
      return this.uploadService.generateS3UploadUrl(
        'profile-pics',
        fileName,
        mimeType,
      );
    } else {
      return {
        uploadUrl: `${this.configService.get('BACKEND_API_URL')}/upload/profile`,
        method: 'PUT',
        maxSize: getMaxFileSize(this.configService, 'general'),
        expiresIn: 300, // 5 minutes
      };
    }
  }

  @Post('bibliography-url')
  @ApiOperation({
    summary:
      'Generate a secure presigned upload URL for bibliography files (PDF/Video/PowerPoint)',
    description:
      'Returns a temporary upload URL that expires in 10 minutes. File size limit: 100MB. Supports PDF, video files (MP4, AVI, MOV, WMV, FLV, WebM), and PowerPoint files (PPT, PPTX).',
  })
  @ApiBody({ type: GetBibliographyUploadUrl })
  @ApiResponse({
    status: 200,
    description: 'Upload URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        uploadUrl: { type: 'string', description: 'Presigned upload URL' },
        fileUrl: { type: 'string', description: 'Final file URL after upload' },
        expiresIn: {
          type: 'number',
          description: 'URL expiry time in seconds',
        },
        maxSize: { type: 'number', description: 'Maximum file size in bytes' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or missing parameters',
  })
  async getBibliographyUploadUrl(@Body() data: GetBibliographyUploadUrl) {
    const { fileName, mimeType } = data;

    if (this.configService.get('NODE_ENV') === 'production') {
      return this.uploadService.generateS3UploadUrl(
        'bibliography',
        fileName,
        mimeType,
      );
    } else {
      return {
        uploadUrl: `${this.configService.get('BACKEND_API_URL')}/upload/bibliography`,
        method: 'PUT',
        maxSize: getMaxFileSize(this.configService, 'bibliography'),
        expiresIn: 600, // 10 minutes
      };
    }
  }

  @Post('thumbnail-url')
  @ApiOperation({
    summary: 'Generate a secure presigned upload URL for thumbnail images',
    description:
      'Returns a temporary upload URL that expires in 5 minutes. File size limit: 5MB.',
  })
  @ApiBody({ type: GetThumbnailUploadUrl })
  @ApiResponse({
    status: 200,
    description: 'Upload URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        uploadUrl: { type: 'string', description: 'Presigned upload URL' },
        fileUrl: { type: 'string', description: 'Final file URL after upload' },
        expiresIn: {
          type: 'number',
          description: 'URL expiry time in seconds',
        },
        maxSize: { type: 'number', description: 'Maximum file size in bytes' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or missing parameters',
  })
  async getThumbnailUploadUrl(@Body() data: GetThumbnailUploadUrl) {
    const { fileName, mimeType } = data;

    if (this.configService.get('NODE_ENV') === 'production') {
      return this.uploadService.generateS3UploadUrl(
        'thumbnails',
        fileName,
        mimeType,
      );
    } else {
      return {
        uploadUrl: `${this.configService.get('BACKEND_API_URL')}/upload/thumbnail`,
        method: 'PUT',
        maxSize: getMaxFileSize(this.configService, 'general'),
        expiresIn: 300, // 5 minutes
      };
    }
  }

  @Get('validate-file')
  @ApiOperation({
    summary: 'Validate an uploaded file',
    description: 'Verify that an uploaded file exists and is valid',
  })
  @ApiQuery({
    name: 'fileUrl',
    description: 'The file URL to validate',
    example:
      'https://bucket.s3.amazonaws.com/profile-pics/123-uuid-filename.jpg',
  })
  @ApiResponse({ status: 200, description: 'File is valid' })
  @ApiResponse({ status: 404, description: 'File not found or invalid' })
  async validateUploadedFile(@Query('fileUrl') fileUrl: string) {
    // Security: Validate that the file URL belongs to our bucket
    const bucketName = this.configService.get('AWS_S3_BUCKET_NAME');
    const expectedDomain = `https://${bucketName}.s3.amazonaws.com/`;

    if (!fileUrl.startsWith(expectedDomain)) {
      throw new BadRequestException(
        'Invalid file URL - must be from authorized bucket',
      );
    }

    // Extract the key from the URL
    const key = fileUrl.replace(expectedDomain, '');

    // Validate key format (folder/timestamp-uuid-filename)
    const keyPattern = /^profile-pics\/\d+-[a-f0-9-]+-[a-z0-9._-]+$/;
    if (!keyPattern.test(key)) {
      throw new BadRequestException('Invalid file key format');
    }

    return {
      message: 'File URL is valid',
      fileUrl,
      validated: true,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('forum-attachment-url')
  @ApiOperation({
    summary: 'Generate a secure presigned upload URL for forum attachments',
    description:
      'Returns a temporary upload URL that expires in 5 minutes. File size limit: 10MB. Supported file types: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, images (JPEG, PNG, WebP, GIF), text files.',
  })
  @ApiBody({ type: GetForumAttachmentUploadUrl })
  @ApiResponse({
    status: 200,
    description: 'Upload URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        uploadUrl: { type: 'string', description: 'Presigned upload URL' },
        fileUrl: { type: 'string', description: 'Final file URL after upload' },
        expiresIn: {
          type: 'number',
          description: 'URL expiry time in seconds',
        },
        maxSize: { type: 'number', description: 'Maximum file size in bytes' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or missing parameters',
  })
  async getForumAttachmentUploadUrl(@Body() body: GetForumAttachmentUploadUrl) {
    const { fileName, mimeType } = body;

    if (this.configService.get('NODE_ENV') === 'production') {
      return this.uploadService.generateS3UploadUrl(
        'forum-attachments',
        fileName,
        mimeType,
      );
    } else {
      return {
        uploadUrl: `${this.configService.get('BACKEND_API_URL')}/upload/forum-attachment`,
        method: 'PUT',
        maxSize: getMaxFileSize(this.configService, 'forum'),
        expiresIn: 300, // 5 minutes
      };
    }
  }

  @ApiOperation({
    summary: 'Upload forum attachment via PUT with raw binary body',
    description: `Send raw file buffer (e.g., PDF, DOC, DOCX, images) in the request body with the appropriate Content-Type header. Must use Postman, curl, or frontend — Swagger UI doesn't support raw binary upload.`,
  })
  @ApiConsumes(
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'text/plain',
    'text/csv',
    'application/octet-stream',
  )
  @ApiQuery({ name: 'filename', required: true })
  @ApiResponse({
    status: 201,
    description: 'Forum attachment uploaded successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @Put('forum-attachment')
  async uploadForumAttachment(
    @Req() req: Request,
    @Res() res: Response,
    @Query('filename') filename: string,
  ) {
    if (!filename) {
      throw new BadRequestException('Filename is required in query');
    }

    const contentType = req.headers['content-type'];
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'text/plain',
      'text/csv',
    ];

    if (
      !contentType ||
      !this.uploadService.validateContentType(contentType, allowedTypes)
    ) {
      throw new BadRequestException(
        `Invalid or unsupported Content-Type. Allowed types: ${allowedTypes.join(', ')}`,
      );
    }

    const ext = extname(filename) || `.${contentType.split('/')[1]}`;
    const id = `${Date.now()}-${uuid()}${ext}`;
    const dir = './uploads/forum-attachments';

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const filePath = `${dir}/${id}`;

    try {
      // Get max file size for forum attachments
      const maxSize = getMaxFileSize(this.configService, 'forum');

      // Use the improved file processing method
      const { buffer, size } = await this.uploadService.processFileBuffer(
        req as any,
        filePath,
        maxSize,
      );

      // Write the file
      writeFileSync(filePath, buffer);

      const fileUrl = `${this.configService.get('BACKEND_API_URL')}/uploads/forum-attachments/${id}`;

      res.status(201).json({
        success: true,
        fileUrl,
        key: `uploads/forum-attachments/${id}`,
        originalName: filename,
        storedName: id,
        size: size,
        mimeType: contentType,
        message: 'Forum attachment uploaded successfully',
        maxSize: maxSize,
        maxSizeMB: maxSize / (1024 * 1024),
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        res.status(400).json({
          success: false,
          error: error.message,
          code: 'VALIDATION_ERROR',
        });
      } else {
        console.error('Forum attachment upload error:', error);
        res.status(500).json({
          success: false,
          error: 'Upload failed',
          details: error.message,
          code: 'UPLOAD_ERROR',
        });
      }
    }
  }

  @ApiOperation({
    summary: 'Upload file via PUT with raw binary body',
    description: `Send raw file buffer (e.g., PDF, MP4, PPT, PPTX) in the request body with the appropriate Content-Type header. Must use Postman, curl, or frontend — Swagger UI doesn't support raw binary upload.`,
  })
  @ApiConsumes(
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
    'application/octet-stream',
  )
  @ApiQuery({ name: 'filename', required: true })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @Put('bibliography')
  async uploadBibliographyFileBuffer(
    @Req() req: Request,
    @Res() res: Response,
    @Query('filename') filename: string,
  ) {
    if (!filename) {
      throw new BadRequestException('Filename is required in query');
    }

    const contentType = req.headers['content-type'];
    const allowedTypes = [
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

    if (
      !contentType ||
      !this.uploadService.validateContentType(contentType, allowedTypes)
    ) {
      throw new BadRequestException(
        `Invalid or unsupported Content-Type. Allowed types: ${allowedTypes.join(', ')}`,
      );
    }

    const ext = extname(filename) || `.${contentType.split('/')[1]}`;
    const id = `${Date.now()}-${uuid()}${ext}`;
    const dir = './uploads/bibliography';

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const filePath = `${dir}/${id}`;

    try {
      // Use the improved file processing method
      const { buffer, size } = await this.uploadService.processFileBuffer(
        req as any,
        filePath,
        getMaxFileSize(this.configService, 'bibliography'),
      );

      // Write the file
      writeFileSync(filePath, buffer);

      const fileUrl = `${this.configService.get('BACKEND_API_URL')}/uploads/bibliography/${id}`;

      res.status(201).json({
        fileUrl,
        key: `uploads/bibliography/${id}`,
        originalName: filename,
        size: size,
        mimeType: contentType,
        message: 'File uploaded successfully',
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        res.status(400).json({ error: error.message });
      } else {
        res
          .status(500)
          .json({ error: 'Upload failed', details: error.message });
      }
    }
  }

  @ApiOperation({
    summary: 'Upload file via PUT with raw binary body',
    description: `Send raw file buffer (e.g., PDF, MP4, JPEG) in the request body with the appropriate Content-Type header. Must use Postman, curl, or frontend — Swagger UI doesn't support raw binary upload.`,
  })
  @ApiConsumes(
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/octet-stream',
  )
  @ApiQuery({ name: 'filename', required: true })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @Put('profile')
  async uploadProfilePicture(
    @Req() req: Request,
    @Res() res: Response,
    @Query('filename') filename: string,
  ) {
    if (!filename) {
      throw new BadRequestException('Filename is required in query');
    }

    const contentType = req.headers['content-type'];
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (
      !contentType ||
      !this.uploadService.validateContentType(contentType, allowedTypes)
    ) {
      throw new BadRequestException(
        `Invalid or missing Content-Type. Allowed types: ${allowedTypes.join(', ')}`,
      );
    }

    const ext = extname(filename) || `.${contentType.split('/')[1]}`;
    const id = `${Date.now()}-${uuid()}${ext}`;
    const dir = './uploads/profile-pics';

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const filePath = `${dir}/${id}`;

    try {
      // Use the improved file processing method
      const { buffer, size } = await this.uploadService.processFileBuffer(
        req as any,
        filePath,
        getMaxFileSize(this.configService, 'general'),
      );

      // Write the file
      writeFileSync(filePath, buffer);

      const fileUrl = `${this.configService.get('BACKEND_API_URL')}/uploads/profile-pics/${id}`;

      res.status(201).json({
        fileUrl,
        key: `uploads/profile-pics/${id}`,
        originalName: filename,
        size: size,
        mimeType: contentType,
        message: 'Profile picture uploaded successfully',
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        res.status(400).json({ error: error.message });
      } else {
        res
          .status(500)
          .json({ error: 'Upload failed', details: error.message });
      }
    }
  }

  @ApiOperation({
    summary: 'Upload thumbnail via PUT with raw binary body',
    description: `Send raw image buffer (JPEG, PNG, WebP) in the request body with the appropriate Content-Type header. Must use Postman, curl, or frontend — Swagger UI doesn't support raw binary upload.`,
  })
  @ApiConsumes(
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/octet-stream',
  )
  @ApiQuery({ name: 'filename', required: true })
  @ApiResponse({ status: 201, description: 'Thumbnail uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @Put('thumbnail')
  async uploadThumbnail(
    @Req() req: Request,
    @Res() res: Response,
    @Query('filename') filename: string,
  ) {
    if (!filename) {
      throw new BadRequestException('Filename is required in query');
    }

    const contentType = req.headers['content-type'];
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (
      !contentType ||
      !this.uploadService.validateContentType(contentType, allowedTypes)
    ) {
      throw new BadRequestException(
        `Invalid or missing Content-Type. Allowed types: ${allowedTypes.join(', ')}`,
      );
    }

    const ext = extname(filename) || `.${contentType.split('/')[1]}`;
    const id = `${Date.now()}-${uuid()}${ext}`;
    const dir = './uploads/thumbnails';

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const filePath = `${dir}/${id}`;

    try {
      // Use the improved file processing method
      const { buffer, size } = await this.uploadService.processFileBuffer(
        req as any,
        filePath,
        getMaxFileSize(this.configService, 'general'),
      );

      // Write the file
      writeFileSync(filePath, buffer);

      const fileUrl = `${this.configService.get('BACKEND_API_URL')}/uploads/thumbnails/${id}`;

      res.status(201).json({
        fileUrl,
        key: `uploads/thumbnails/${id}`,
        originalName: filename,
        size: size,
        mimeType: contentType,
        message: 'Thumbnail uploaded successfully',
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        res.status(400).json({ error: error.message });
      } else {
        res
          .status(500)
          .json({ error: 'Upload failed', details: error.message });
      }
    }
  }

  @Get('forum-attachments/:filename')
  @ApiOperation({
    summary: 'Get forum attachment file (development only)',
    description:
      'Retrieve a forum attachment file by filename. This endpoint is for development environment only.',
  })
  @ApiParam({ name: 'filename', description: 'Forum attachment filename' })
  @ApiResponse({ status: 200, description: 'File retrieved successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getForumAttachment(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // Security: Validate filename to prevent directory traversal
    if (
      filename.includes('..') ||
      filename.includes('/') ||
      filename.includes('\\')
    ) {
      throw new BadRequestException('Invalid filename');
    }

    const filePath = `./uploads/forum-attachments/${filename}`;

    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    // Determine content type based on file extension
    const ext = extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';

    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.doc') contentType = 'application/msword';
    else if (ext === '.docx')
      contentType =
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (ext === '.xls') contentType = 'application/vnd.ms-excel';
    else if (ext === '.xlsx')
      contentType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (ext === '.ppt') contentType = 'application/vnd.ms-powerpoint';
    else if (ext === '.pptx')
      contentType =
        'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    else if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.txt') contentType = 'text/plain';
    else if (ext === '.csv') contentType = 'text/csv';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    // Stream the file
    const fs = require('fs');
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }
}
