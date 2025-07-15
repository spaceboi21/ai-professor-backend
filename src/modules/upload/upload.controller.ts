import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UseFilters,
  Get,
  Query,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { v4 as uuid } from 'uuid';
import { GetFileUploadUrl } from './dto/get-upload-url.dto';
import { GetBibliographyUploadUrl } from './dto/get-bibliography-upload-url.dto';
import { UploadService } from './upload.service';
import { ConfigService } from '@nestjs/config';
import { existsSync, writeFileSync } from 'fs';
import { mkdirSync } from 'fs';
import { UploadExceptionFilter } from 'src/common/filters/upload-exception.filter';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { Request, Response } from 'express';
import { IncomingMessage } from 'http';

const allowedImageTypes = ['.jpg', '.jpeg', '.png', '.webp'];
const allowedBibliographyTypes = [
  '.pdf',
  '.mp4',
  '.avi',
  '.mov',
  '.wmv',
  '.flv',
  '.webm',
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
        'Only PDF and video files (PDF, MP4, AVI, MOV, WMV, FLV, WebM) are allowed',
      ),
      false,
    );
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
        maxSize:
          (this.configService.get<number>('MAXIMUM_FILE_SIZE') ?? 5) *
          1024 *
          1024, // 5MB
        expiresIn: 300, // 5 minutes
      };
    }
  }

  @Post('bibliography-url')
  @ApiOperation({
    summary:
      'Generate a secure presigned upload URL for bibliography files (PDF/Video)',
    description:
      'Returns a temporary upload URL that expires in 10 minutes. File size limit: 100MB.',
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
        maxSize:
          (this.configService.get<number>('MAXIMUM_BIBLIOGRAPHY_FILE_SIZE') ??
            100) *
          1024 *
          1024, // 100MB
        expiresIn: 600, // 10 minutes
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

  @ApiOperation({
    summary: 'Upload file via PUT with raw binary body',
    description: `Send raw file buffer (e.g., PDF, MP4, JPEG) in the request body with the appropriate Content-Type header. Must use Postman, curl, or frontend — Swagger UI doesn't support raw binary upload.`,
  })
  @ApiConsumes('application/pdf', 'application/octet-stream', 'image/jpeg')
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
    if (!contentType || !contentType.startsWith('image/')) {
      throw new BadRequestException('Invalid or missing Content-Type');
    }

    const ext = extname(filename) || `.${contentType.split('/')[1]}`;
    const id = `${Date.now()}-${uuid()}${ext}`;
    const dir = './uploads/profile-pics';

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const filePath = `${dir}/${id}`;
    const chunks: Buffer[] = [];

    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      const buffer = Buffer.concat(chunks);

      writeFileSync(filePath, buffer);

      const fileUrl = `${process.env.BACKEND_URL}/uploads/profile-pics/${id}`;

      res.status(201).json({
        fileUrl,
        key: `uploads/profile-pics/${id}`,
        originalName: filename,
        size: buffer.length,
        mimeType: contentType,
      });
    });
  }

  @ApiOperation({
    summary: 'Upload file via PUT with raw binary body',
    description: `Send raw file buffer (e.g., PDF, MP4, JPEG) in the request body with the appropriate Content-Type header. Must use Postman, curl, or frontend — Swagger UI doesn't support raw binary upload.`,
  })
  @ApiConsumes('application/pdf', 'application/octet-stream', 'image/jpeg')
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
    ];

    if (!contentType || !allowedTypes.includes(contentType)) {
      throw new BadRequestException('Invalid or unsupported Content-Type');
    }

    const ext = extname(filename) || `.${contentType.split('/')[1]}`;
    const id = `${Date.now()}-${uuid()}${ext}`;
    const dir = './uploads/bibliography';

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const filePath = `${dir}/${id}`;
    const chunks: Buffer[] = [];

    const incoming = req as unknown as IncomingMessage;

    incoming.on('data', (chunk) => {
      chunks.push(chunk);
    });

    incoming.on('end', () => {
      const buffer = Buffer.concat(chunks);
      writeFileSync(filePath, buffer);

      const fileUrl = `${process.env.BACKEND_URL}/uploads/bibliography/${id}`;

      res.status(201).json({
        fileUrl,
        key: `uploads/bibliography/${id}`,
        originalName: filename,
        size: buffer.length,
        mimeType: contentType,
      });
    });

    incoming.on('error', (err) => {
      res.status(500).json({ error: 'Upload failed', details: err });
    });
  }
}
