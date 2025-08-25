import {
  Controller,
  Post,
  Get,
  Delete,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Logger,
  Query,
  Param,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { ApiTags, ApiOperation, ApiConsumes, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConversionService, ConversionResponse } from '../services/conversion.service';
import { ConversionRequestDto } from '../dto/conversion-request.dto';
import { User } from 'src/common/decorators/user.decorator';

@ApiTags('PPT to PDF Conversion')
@Controller('conversion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ConversionController {
  private readonly logger = new Logger(ConversionController.name);

  constructor(private conversionService: ConversionService) {}

  @Post('convert')
  @UseInterceptors(FileInterceptor('pptFile', {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
  }))
  @ApiOperation({ 
    summary: 'Convert PowerPoint to PDF',
    description: 'Upload a PowerPoint file (.ppt or .pptx) to convert it to PDF. Returns the converted PDF URL directly.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ 
    status: 200, 
    description: 'Conversion completed successfully',
    schema: {
      example: {
        success: true,
        message: 'Successfully converted 10 slides to PDF',
        fileName: 'presentation-1234567890.pdf',
        originalFileName: 'presentation-1234567890.pptx',
        slideCount: 10,
        fileSize: 2048000,
        originalFileSize: 5120000,
        conversionMethod: 'LibreOffice-Direct (Ultra Fast)',
        conversionTime: 3500,
        fileUrl: 'http://localhost:3000/uploads/bibliography/presentation-1234567890.pdf',
        originalFileUrl: 'http://localhost:3000/uploads/bibliography/presentation-1234567890.pptx'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid file or bad request' })
  @ApiResponse({ status: 500, description: 'Conversion failed' })
  async convertPptToPdf(
    @UploadedFile() file: Express.Multer.File,
    @User() user: any,
  ): Promise<ConversionResponse> {
    const startTime = Date.now();
    this.logger.log(`🚀 Starting direct conversion for: ${file?.originalname} by user: ${user?.id}`);

    try {
      const result = await this.conversionService.convertPptToPdf(file, user?.id);
      const totalTime = Date.now() - startTime;
      
      this.logger.log(`✅ Direct conversion completed in ${totalTime}ms`);
      return result;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.logger.error(`❌ Direct conversion failed after ${totalTime}ms: ${error.message}`);
      throw error;
    }
  }



  @Get('system-info')
  @ApiOperation({ 
    summary: 'Get system information',
    description: 'Get system information including LibreOffice status and configuration.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'System information retrieved successfully',
    schema: {
      example: {
        platform: 'win32',
        nodeVersion: 'v18.17.0',
        nodeEnv: 'development',
        libreOffice: {
          found: true,
          path: 'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
          valid: true
        },
        config: {
          maxFileSize: 52428800,
          conversionTimeout: 300000,
          batchSize: 5,
          maxConcurrent: 3
        }
      }
    }
  })
  async getSystemInfo() {
    return this.conversionService.getSystemInfo();
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Health check',
    description: 'Health check endpoint to verify the conversion service is operational.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is healthy',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2024-01-15T10:30:00.000Z',
        service: 'ppt-to-pdf-converter',
        libreOfficeAvailable: true
      }
    }
  })
  async healthCheck() {
    const systemInfo = await this.conversionService.getSystemInfo();
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'ppt-to-pdf-converter',
      libreOfficeAvailable: systemInfo.libreOffice.found,
    };
  }
}
