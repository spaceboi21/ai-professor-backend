import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/database/schemas/central/user.schema';
import { School } from 'src/database/schemas/central/school.schema';
import {
  Internship,
  InternshipSchema,
} from 'src/database/schemas/tenant/internship.schema';
import {
  InternshipCase,
  InternshipCaseSchema,
} from 'src/database/schemas/tenant/internship-case.schema';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { attachUserDetailsToEntity } from 'src/common/utils/user-details.util';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import { DEFAULT_LANGUAGE } from 'src/common/constants/language.constant';
import { PythonInternshipService } from './python-internship.service';

@Injectable()
export class InternshipCaseService {
  private readonly logger = new Logger(InternshipCaseService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly errorMessageService: ErrorMessageService,
    private readonly pythonInternshipService: PythonInternshipService,
  ) {}

  /**
   * Helper method to resolve school_id based on user role
   */
  private resolveSchoolId(
    user: JWTUserPayload,
    bodySchoolId?: string | Types.ObjectId,
  ): string {
    if (user.role.name === RoleEnum.SUPER_ADMIN) {
      if (!bodySchoolId) {
        throw new BadRequestException(
          'School ID is required for super admin',
        );
      }
      return bodySchoolId.toString();
    } else {
      if (!user.school_id) {
        throw new BadRequestException('User school ID not found');
      }
      return user.school_id.toString();
    }
  }

  /**
   * Create a case for an internship
   */
  async createCase(
    internshipId: string,
    createCaseDto: CreateCaseDto,
    user: JWTUserPayload,
  ) {
    this.logger.log(`Creating case for internship: ${internshipId} by user: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const InternshipModel = tenantConnection.model(Internship.name, InternshipSchema);
    const CaseModel = tenantConnection.model(InternshipCase.name, InternshipCaseSchema);

    try {
      // Verify internship exists
      const internship = await InternshipModel.findOne({
        _id: new Types.ObjectId(internshipId),
        deleted_at: null,
      });

      if (!internship) {
        throw new NotFoundException('Internship not found');
      }

      // Prepare case data
      const caseData = {
        ...createCaseDto,
        internship_id: new Types.ObjectId(internshipId),
        created_by: new Types.ObjectId(user.id),
        created_by_role: user.role.name as RoleEnum,
      };

      // Create case in tenant database
      const newCase = new CaseModel(caseData);
      const savedCase = await newCase.save();

      this.logger.log(`Case created in tenant DB: ${savedCase._id}`);

      // Ingest case into Python/Pinecone for AI patient simulation
      try {
        const ingestionResult = await this.pythonInternshipService.ingestCase({
          case_id: savedCase._id.toString(),
          case_title: savedCase.title,
          case_content: savedCase.case_content || '',
          case_documents: savedCase.case_documents || [],
          metadata: {
            created_by: user.id,
            internship_id: savedCase.internship_id.toString(),
            difficulty: savedCase.patient_simulation_config?.difficulty_level,
            condition: savedCase.patient_simulation_config?.patient_profile?.condition,
            created_at: savedCase.created_at,
          },
        });

        if (ingestionResult.success) {
          this.logger.log(
            `Case ${savedCase._id} ingested successfully into Python/Pinecone`,
          );
        } else {
          this.logger.warn(
            `Case ${savedCase._id} created but ingestion failed: ${ingestionResult.error}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Case ingestion failed but case created: ${error.message}`,
        );
        // Case is still saved in MongoDB, just Python ingestion failed
      }

      return {
        message: 'Case created successfully',
        data: savedCase,
      };
    } catch (error) {
      this.logger.error('Error creating case', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Check for duplicate sequence or title error
      if (error.code === 11000) {
        throw new BadRequestException('Case with this sequence or title already exists in this internship');
      }
      throw new BadRequestException('Failed to create case');
    }
  }

  /**
   * Get all cases for an internship
   */
  async findCasesByInternship(internshipId: string, user: JWTUserPayload) {
    this.logger.log(`Finding cases for internship: ${internshipId}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const CaseModel = tenantConnection.model(InternshipCase.name, InternshipCaseSchema);

    try {
      const cases = await CaseModel.find({
        internship_id: new Types.ObjectId(internshipId),
        deleted_at: null,
      })
        .sort({ sequence: 1 })
        .lean();

      return {
        message: 'Cases retrieved successfully',
        data: cases,
      };
    } catch (error) {
      this.logger.error('Error finding cases', error?.stack || error);
      throw new BadRequestException('Failed to retrieve cases');
    }
  }

  /**
   * Get single case by ID
   */
  async findCaseById(caseId: string, user: JWTUserPayload) {
    this.logger.log(`Finding case by id: ${caseId}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const CaseModel = tenantConnection.model(InternshipCase.name, InternshipCaseSchema);

    try {
      const caseData = await CaseModel.findOne({
        _id: new Types.ObjectId(caseId),
        deleted_at: null,
      }).lean();

      if (!caseData) {
        throw new NotFoundException('Case not found');
      }

      // Attach user details
      const caseWithUser = await attachUserDetailsToEntity(
        caseData,
        this.userModel,
      );

      return {
        message: 'Case retrieved successfully',
        data: caseWithUser,
      };
    } catch (error) {
      this.logger.error('Error finding case', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve case');
    }
  }

  /**
   * Update case
   */
  async updateCase(
    caseId: string,
    updateCaseDto: UpdateCaseDto,
    user: JWTUserPayload,
  ) {
    this.logger.log(`Updating case: ${caseId} by user: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const CaseModel = tenantConnection.model(InternshipCase.name, InternshipCaseSchema);

    try {
      const updatedCase = await CaseModel.findOneAndUpdate(
        { _id: new Types.ObjectId(caseId), deleted_at: null },
        { ...updateCaseDto, updated_at: new Date() },
        { new: true },
      ).lean();

      if (!updatedCase) {
        throw new NotFoundException('Case not found');
      }

      // Re-ingest case into Python/Pinecone (this updates existing data)
      try {
        const ingestionResult = await this.pythonInternshipService.ingestCase({
          case_id: updatedCase._id.toString(),
          case_title: updatedCase.title,
          case_content: updatedCase.case_content || '',
          case_documents: updatedCase.case_documents || [],
          metadata: {
            updated_by: user.id,
            internship_id: updatedCase.internship_id.toString(),
            difficulty: updatedCase.patient_simulation_config?.difficulty_level,
            condition: updatedCase.patient_simulation_config?.patient_profile?.condition,
            updated_at: new Date(),
          },
        });

        if (ingestionResult.success) {
          this.logger.log(
            `Case ${updatedCase._id} re-ingested successfully into Python/Pinecone`,
          );
        } else {
          this.logger.warn(
            `Case ${updatedCase._id} updated but re-ingestion failed: ${ingestionResult.error}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Case re-ingestion failed: ${error.message}`,
        );
        // Case is still updated in MongoDB
      }

      // Attach user details
      const caseWithUser = await attachUserDetailsToEntity(
        updatedCase,
        this.userModel,
      );

      return {
        message: 'Case updated successfully',
        data: caseWithUser,
      };
    } catch (error) {
      this.logger.error('Error updating case', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.code === 11000) {
        throw new BadRequestException('Case with this sequence or title already exists in this internship');
      }
      throw new BadRequestException('Failed to update case');
    }
  }

  /**
   * Soft delete case
   */
  async removeCase(caseId: string, user: JWTUserPayload) {
    this.logger.log(`Removing case: ${caseId} by user: ${user.id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const CaseModel = tenantConnection.model(InternshipCase.name, InternshipCaseSchema);

    try {
      // Delete from Python/Pinecone FIRST before MongoDB soft delete
      try {
        const deletionResult = await this.pythonInternshipService.deleteCase(caseId);
        
        if (deletionResult.success) {
          this.logger.log(
            `Case ${caseId} deleted successfully from Python/Pinecone`,
          );
        } else {
          this.logger.warn(
            `Failed to delete case ${caseId} from Python: ${deletionResult.error}`,
          );
          // Continue with MongoDB deletion anyway
        }
      } catch (error) {
        this.logger.error(
          `Failed to delete case from Python: ${error.message}`,
        );
        // Continue with MongoDB deletion anyway
      }

      // Now soft delete in MongoDB
      const deletedCase = await CaseModel.findOneAndUpdate(
        { _id: new Types.ObjectId(caseId), deleted_at: null },
        { deleted_at: new Date() },
        { new: true },
      );

      if (!deletedCase) {
        throw new NotFoundException('Case not found');
      }

      return {
        message: 'Case deleted successfully',
        data: {
          id: deletedCase._id,
        },
      };
    } catch (error) {
      this.logger.error('Error removing case', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete case');
    }
  }

  /**
   * Update case sequence
   */
  async updateCaseSequence(
    caseId: string,
    newSequence: number,
    user: JWTUserPayload,
  ) {
    this.logger.log(`Updating case ${caseId} sequence to ${newSequence}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const CaseModel = tenantConnection.model(InternshipCase.name, InternshipCaseSchema);

    try {
      // Find the case
      const caseToUpdate = await CaseModel.findOne({
        _id: new Types.ObjectId(caseId),
        deleted_at: null,
      });

      if (!caseToUpdate) {
        throw new NotFoundException('Case not found');
      }

      const currentSequence = caseToUpdate.sequence;
      const internshipId = caseToUpdate.internship_id;

      // If sequence is the same, no need to update
      if (currentSequence === newSequence) {
        return {
          message: 'Case sequence unchanged',
          data: { case_id: caseId, sequence: newSequence },
        };
      }

      // Get all cases in the same internship
      const allCases = await CaseModel.find({
        internship_id: internshipId,
        deleted_at: null,
        _id: { $ne: new Types.ObjectId(caseId) },
      }).sort({ sequence: 1 });

      // Reorder sequences
      const reorderedCases = this.reorderCaseSequences(
        allCases,
        newSequence,
        currentSequence,
      );

      // Update all affected cases
      const updatePromises = reorderedCases.map((c) =>
        CaseModel.updateOne(
          { _id: c._id },
          { sequence: c.sequence, updated_at: new Date() },
        ),
      );

      // Update the target case
      updatePromises.push(
        CaseModel.updateOne(
          { _id: new Types.ObjectId(caseId) },
          { sequence: newSequence, updated_at: new Date() },
        ),
      );

      await Promise.all(updatePromises);

      this.logger.log(
        `Case ${caseId} sequence updated from ${currentSequence} to ${newSequence}`,
      );

      return {
        message: 'Case sequence updated successfully',
        data: {
          case_id: caseId,
          sequence: newSequence,
        },
      };
    } catch (error) {
      this.logger.error('Error updating case sequence', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update case sequence');
    }
  }

  /**
   * Helper method to reorder case sequences
   */
  private reorderCaseSequences(
    cases: any[],
    newSequence: number,
    currentSequence: number,
  ) {
    const reorderedCases = [...cases];

    if (currentSequence === null) {
      // Case doesn't have a sequence yet, insert it
      reorderedCases.forEach((c) => {
        if (c.sequence >= newSequence) {
          c.sequence = c.sequence + 1;
        }
      });
    } else if (newSequence > currentSequence) {
      // Moving down in sequence
      reorderedCases.forEach((c) => {
        if (c.sequence > currentSequence && c.sequence <= newSequence) {
          c.sequence = c.sequence - 1;
        }
      });
    } else if (newSequence < currentSequence) {
      // Moving up in sequence
      reorderedCases.forEach((c) => {
        if (c.sequence >= newSequence && c.sequence < currentSequence) {
          c.sequence = c.sequence + 1;
        }
      });
    }

    return reorderedCases;
  }
}

