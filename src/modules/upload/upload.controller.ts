import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Get,
  Query,
  HttpStatus,
  ParseFilePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
import { extname } from 'path';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { v4 as uuid } from 'uuid';
import { GetFileUploadUrl } from './dto/get-upload-url.dto';
import { UploadService } from './upload.service';
import { ConfigService } from '@nestjs/config';
import { CustomFileTypeValidator } from 'src/common/utils/custom-file-type-validator.utils';
import { MaxFileSizeValidator } from 'src/common/pipes/max-file-size-validate.pipe';

@Controller('upload')
@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
        method: 'POST',
        maxSize:
          (this.configService.get<number>('MAXIMUM_FILE_SIZE') ?? 5) *
          1024 *
          1024, // 5MB
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

  @Post('profile')
  @ApiOperation({
    summary: 'Upload profile picture (Development only)',
    description: 'Direct file upload for development environment',
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or upload error' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/profile-pics',
        filename: (req, file, cb) => {
          const ext = extname(file.originalname);
          const timestamp = Date.now();
          cb(null, `${timestamp}-${uuid()}${ext}`);
        },
      }),
    }),
  )
  uploadProfileImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new CustomFileTypeValidator({
            fileType: /^image\//,
            errorMessage: 'Only image files (JPEG, PNG, WebP) are allowed',
          }),
          new MaxFileSizeValidator(new ConfigService()),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const key = `uploads/profile-pics/${file.filename}`;
    const fileUrl = `${this.configService.get('BACKEND_URL')}/${key}`;

    return {
      fileUrl,
      key,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }
}
