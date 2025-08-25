import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { User } from 'src/common/decorators/user.decorator';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PptBibliographyService } from './ppt-bibliography.service';

@ApiTags('PowerPoint Bibliography')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('bibliography/ppt')
export class PptBibliographyController {
  private readonly logger = new Logger(PptBibliographyController.name);

  constructor(
    private readonly pptBibliographyService: PptBibliographyService,
  ) {}

  @Post(':bibliographyId/process')
  @Roles(RoleEnum.PROFESSOR, RoleEnum.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Process PPT for an existing bibliography',
    description:
      'Parses the PowerPoint associated with the given bibliography (via its stored path) and stores parsed slide data. No anchor tags are created automatically.',
  })
  @ApiParam({
    name: 'bibliographyId',
    description: 'Bibliography ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 201,
    description: 'PowerPoint processed successfully',
    schema: {
      type: 'object',
      properties: {
        bibliography: { type: 'object' },
        pptData: {
          type: 'object',
          properties: {
            totalSlides: { type: 'number' },
            metadata: { type: 'object' },
            slides: { type: 'array' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Bibliography or PPT not found' })
  async processExistingBibliographyPpt(
    @Param('bibliographyId', ParseObjectIdPipe)
    bibliographyId: string | Types.ObjectId,
    @User() user: JWTUserPayload,
  ) {
    return await this.pptBibliographyService.processPowerPointForBibliography(
      bibliographyId.toString(),
      user,
    );
  }

  @Get(':bibliographyId/slides/:slideNumber')
  @Roles(
    RoleEnum.SUPER_ADMIN,
    RoleEnum.SCHOOL_ADMIN,
    RoleEnum.PROFESSOR,
    RoleEnum.STUDENT,
  )
  @ApiOperation({
    summary: 'Get slide information',
    description:
      'Retrieve information about a specific slide from PowerPoint presentation',
  })
  @ApiParam({
    name: 'bibliographyId',
    description: 'Bibliography ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiParam({
    name: 'slideNumber',
    description: 'Slide number (1-based)',
    example: '3',
  })
  @ApiResponse({
    status: 200,
    description: 'Slide information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        slide: { type: 'object' },
        anchorTags: {
          type: 'array',
          description: 'Anchor tags (quizzes) associated with this slide',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              content_type: { type: 'string' },
              slide_number: { type: 'number' },
              status: { type: 'string' },
              is_mandatory: { type: 'boolean' },
              quiz_group_id: { type: 'string' },
            },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 404,
    description: 'Bibliography, PPT data, or slide not found',
  })
  async getSlideInfo(
    @Param('bibliographyId', ParseObjectIdPipe)
    bibliographyId: string | Types.ObjectId,
    @Param('slideNumber') slideNumber: string,
    @User() user: JWTUserPayload,
  ) {
    const slideNum = parseInt(slideNumber);
    if (isNaN(slideNum) || slideNum < 1) {
      throw new BadRequestException(
        'Invalid slide number. Must be a positive integer.',
      );
    }

    return await this.pptBibliographyService.getSlideInfo(
      bibliographyId.toString(),
      slideNum,
      user,
    );
  }
}
