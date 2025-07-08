import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { v4 as uuid } from 'uuid';
import { GetFileUploadUrl } from './dto/get-upload-url.dto';
import { UploadService } from './upload.service';
import { ConfigService } from '@nestjs/config';

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
  @ApiOperation({ summary: 'Generate a new Profile upload URL' })
  @ApiBody({ type: GetFileUploadUrl })
  @ApiResponse({ status: 200, description: 'Student created successfully' })
  @ApiResponse({ status: 400, description: 'Missing fileName or mimeType' })
  async getProfileUploadUrl(@Body() data: GetFileUploadUrl) {
    const { fileName, mimeType } = data;
    if (this.configService.get('NODE_ENV') === 'production') {
      if (!fileName || !mimeType) {
        throw new BadRequestException('Missing fileName or mimeType');
      }
      return this.uploadService.generateS3UploadUrl(
        'profile-pics',
        fileName,
        mimeType,
      );
    } else {
      return {
        uploadUrl: `${this.configService.get('BACKEND_API_URL')}/upload/profile`,
        method: 'POST',
      };
    }
  }

  @Post('profile')
  @ApiOperation({ summary: 'Upload Profile pic on Development server' })
  @ApiResponse({ status: 201, description: 'Student created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/profile-pics',
        filename: (req, file, cb) => {
          const ext = extname(file.originalname);
          cb(null, `${uuid()}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('Only image files are allowed'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  uploadProfileImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const key = `uploads/profile-pics/${file.filename}`;
    const fileUrl = `${this.configService.get('BACKEND_URL')}/${key}`;
    return { fileUrl, key };
  }
}
