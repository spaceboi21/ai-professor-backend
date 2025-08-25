import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/database/schemas/central/user.schema';
import { School } from 'src/database/schemas/central/school.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { BibliographyService } from './bibliography.service';
import { PptParserService, PptData } from './ppt-parser.service';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { BibliographyTypeEnum } from 'src/common/constants/bibliography-type.constant';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import { DEFAULT_LANGUAGE } from 'src/common/constants/language.constant';
import {
  PptData as PptDataModel,
  PptDataSchema,
} from 'src/database/schemas/tenant/ppt-data.schema';
import {
  Bibliography,
  BibliographySchema,
} from 'src/database/schemas/tenant/bibliography.schema';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ConfigService } from '@nestjs/config';
import {
  AnchorTag,
  AnchorTagSchema,
} from 'src/database/schemas/tenant/anchor-tag.schema';

@Injectable()
export class PptBibliographyService {
  private readonly logger = new Logger(PptBibliographyService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly bibliographyService: BibliographyService,
    private readonly pptParserService: PptParserService,
    private readonly errorMessageService: ErrorMessageService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Process PPT for an existing bibliography by loading its stored file path
   * Handles both staging (local server) and production (S3) file storage
   */
  async processPowerPointForBibliography(
    bibliographyId: string,
    user: JWTUserPayload,
  ) {
    // Get tenant connection and fetch bibliography to read its path
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }
    const connection = await this.tenantConnectionService.getTenantConnection(
      school.db_name,
    );
    const BibliographyModel = connection.model(
      Bibliography.name,
      BibliographySchema,
    );

    const bibliography = await BibliographyModel.findOne({
      _id: new Types.ObjectId(bibliographyId),
      deleted_at: null,
    });

    if (!bibliography) {
      throw new NotFoundException('Bibliography not found');
    }

    if (
      bibliography.type !== BibliographyTypeEnum.SLIDE &&
      bibliography.type !== BibliographyTypeEnum.POWERPOINT
    ) {
      throw new BadRequestException(
        'Bibliography is not a PowerPoint/Slide type',
      );
    }

    // Load the file based on environment
    if (!bibliography.path) {
      throw new BadRequestException('Bibliography file path is missing');
    }

    let fileBuffer: Buffer;
    const nodeEnv = this.configService.get('NODE_ENV');

    if (nodeEnv === 'production') {
      // Production: Fetch from S3
      fileBuffer = await this.fetchFileFromS3(bibliography.path.toString());
    } else {
      // Staging: Read from local server
      fileBuffer = await this.readFileFromLocalServer(
        bibliography.path.toString(),
      );
    }

    if (!this.pptParserService.validatePowerPointFile(fileBuffer)) {
      throw new BadRequestException('Invalid PowerPoint file format');
    }

    const pptData = await this.pptParserService.parsePptFile(fileBuffer);

    // Store PPT data (overwrite if exists)
    await this.storeOrUpdatePptData(bibliographyId, pptData, user, connection);

    return {
      bibliography,
      pptData: {
        totalSlides: pptData.totalSlides,
        metadata: pptData.metadata,
        slides: pptData.slides.map((slide) => ({
          slideNumber: slide.slideNumber,
          title: slide.title,
          content: slide.content,
          notes: slide.notes,
          background: slide.background,
        })),
      },
      message: `PowerPoint processed successfully. ${pptData.totalSlides} slides found. Use the bibliography ID to create anchor tags manually.`,
    };
  }

  /**
   * Get PPT data for a specific bibliography
   */
  async getPowerPointData(bibliographyId: string, user: JWTUserPayload) {
    try {
      // Get school connection
      const school = await this.schoolModel.findById(user.school_id);
      if (!school) {
        throw new NotFoundException('School not found');
      }

      const connection = await this.tenantConnectionService.getTenantConnection(
        school.db_name,
      );
      const PptDataModelInstance = connection.model(
        PptDataModel.name,
        PptDataSchema,
      );

      // Find PPT data
      const pptDataDoc = await PptDataModelInstance.findOne({
        bibliography_id: new Types.ObjectId(bibliographyId),
        deleted_at: null,
      });

      if (!pptDataDoc) {
        throw new NotFoundException('PPT data not found for this bibliography');
      }

      // Convert object back to Map
      const slideMapping = new Map<number, string>();
      if (
        pptDataDoc.slideMapping &&
        typeof pptDataDoc.slideMapping === 'object'
      ) {
        const slideMappingObj = pptDataDoc.slideMapping as unknown as Record<
          string,
          string
        >;
        Object.entries(slideMappingObj).forEach(([key, value]) => {
          slideMapping.set(parseInt(key), value);
        });
      }

      return {
        totalSlides: pptDataDoc.totalSlides as number,
        slides: pptDataDoc.slides as any[],
        metadata: pptDataDoc.metadata as any,
        slideMapping,
      };
    } catch (error) {
      this.logger.error(`Failed to get PPT data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get slide information for a specific slide number
   */
  async getSlideInfo(
    bibliographyId: string,
    slideNumber: number,
    user: JWTUserPayload,
  ) {
    try {
      const pptData = await this.getPowerPointData(bibliographyId, user);
      const slide = pptData.slides.find((s) => s.slideNumber === slideNumber);

      if (!slide) {
        throw new NotFoundException(`Slide ${slideNumber} not found`);
      }

      // Get anchor tags for this specific slide
      const anchorTags = await this.getAnchorTagsForSlide(
        bibliographyId,
        slideNumber,
        user,
      );

      return {
        slide,
        anchorTags,
        message: `Slide ${slideNumber} information retrieved successfully with ${anchorTags.length} anchor tags`,
      };
    } catch (error) {
      this.logger.error(`Failed to get slide info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get anchor tags for a specific slide
   */
  private async getAnchorTagsForSlide(
    bibliographyId: string,
    slideNumber: number,
    user: JWTUserPayload,
  ) {
    try {
      // Get school connection
      const school = await this.schoolModel.findById(user.school_id);
      if (!school) {
        throw new NotFoundException('School not found');
      }

      const connection = await this.tenantConnectionService.getTenantConnection(
        school.db_name,
      );

      // Debug: Log the query parameters
      this.logger.log(
        `Searching for anchor tags with: bibliography_id: ${bibliographyId}, slide_number: ${slideNumber}`,
      );

      // First, let's see what anchor tags exist for this bibliography
      const allAnchorTags = await connection
        .model(AnchorTag.name, AnchorTagSchema)
        .find({
          bibliography_id: new Types.ObjectId(bibliographyId),
          deleted_at: null,
        })
        .lean();

      this.logger.log(
        `Total anchor tags for bibliography ${bibliographyId}: ${allAnchorTags.length}`,
      );

      if (allAnchorTags.length > 0) {
        this.logger.log(
          `All anchor tags: ${JSON.stringify(
            allAnchorTags.map((at) => ({
              id: at._id,
              slide_number: at.slide_number,
              status: at.status,
              title: at.title,
            })),
          )}`,
        );
      }

      // Get anchor tags for this bibliography and slide number
      const anchorTags = await connection
        .model(AnchorTag.name, AnchorTagSchema)

        .find({
          bibliography_id: new Types.ObjectId(bibliographyId),
          slide_number: slideNumber,
          deleted_at: null,
          status: 'ACTIVE',
        })
        .lean();

      this.logger.log(
        `Found ${anchorTags.length} anchor tags for slide ${slideNumber}`,
      );

      // Debug: Log the first anchor tag if exists
      if (anchorTags.length > 0) {
        this.logger.log(`First anchor tag: ${JSON.stringify(anchorTags[0])}`);
      }

      return anchorTags || [];
    } catch (error) {
      this.logger.error(
        `Failed to get anchor tags for slide: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Fetch file from S3 (production environment)
   */
  private async fetchFileFromS3(s3Url: string): Promise<Buffer> {
    try {
      // For production, you might want to use AWS SDK to fetch the file
      // For now, we'll use a simple HTTP fetch
      const response = await fetch(s3Url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file from S3: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      this.logger.error(`Failed to fetch file from S3: ${s3Url}`, error);
      throw new BadRequestException('Failed to fetch PowerPoint file from S3');
    }
  }

  /**
   * Read file from local server (staging environment)
   */
  private async readFileFromLocalServer(filePath: string): Promise<Buffer> {
    try {
      const absolutePath = resolve(process.cwd(), filePath);
      return readFileSync(absolutePath);
    } catch (error) {
      this.logger.error(
        `Failed to read PPT file from local path: ${filePath}`,
        error,
      );
      throw new NotFoundException('PPT file not found at stored local path');
    }
  }

  private async storeOrUpdatePptData(
    bibliographyId: string,
    pptData: PptData,
    user: JWTUserPayload,
    connection: any,
  ) {
    const PptDataModelInstance = connection.model(
      PptDataModel.name,
      PptDataSchema,
    );

    // Convert Map to object for MongoDB storage
    const slideMappingObject: Record<string, string> = {};
    pptData.slideMapping.forEach((value, key) => {
      slideMappingObject[key] = value;
    });

    const existing = await PptDataModelInstance.findOne({
      bibliography_id: new Types.ObjectId(bibliographyId),
      deleted_at: null,
    });

    if (existing) {
      existing.totalSlides = pptData.totalSlides;
      existing.slides = pptData.slides as any;
      existing.metadata = pptData.metadata as any;
      existing.slideMapping = slideMappingObject as any;
      await existing.save();
      return existing;
    }

    const created = new PptDataModelInstance({
      bibliography_id: new Types.ObjectId(bibliographyId),
      totalSlides: pptData.totalSlides,
      slides: pptData.slides,
      metadata: pptData.metadata,
      slideMapping: slideMappingObject,
      created_by: new Types.ObjectId(user.id),
    });

    await created.save();
    return created;
  }
}
