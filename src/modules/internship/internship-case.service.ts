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
import { InternshipS3Service } from './s3.service';
import { normalizePatientSimulationConfig } from './utils/enum-mapping.util';
import { UploadCaseDocumentDto } from './dto/upload-case-document.dto';

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
    private readonly s3Service: InternshipS3Service,
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

      // Normalize patient_simulation_config to ensure enum values are in English
      const normalizedDto = { ...createCaseDto };
      if (normalizedDto.patient_simulation_config) {
        normalizedDto.patient_simulation_config = normalizePatientSimulationConfig(
          normalizedDto.patient_simulation_config
        );
        this.logger.log(
          `Normalized patient_simulation_config: scenario_type=${normalizedDto.patient_simulation_config?.scenario_type}, difficulty_level=${normalizedDto.patient_simulation_config?.difficulty_level}`
        );
      }

      // Prepare case data
      const caseData = {
        ...normalizedDto,
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
   * Normalize a case document for API response (ensures _id, id, and caseId for frontend).
   */
  private normalizeCaseForResponse(caseData: any): any {
    const idStr = caseData._id?.toString?.() ?? caseData._id;
    return {
      ...caseData,
      _id: caseData._id,
      id: idStr,
      caseId: idStr,
    };
  }

  /**
   * Get all cases for an internship
   * Response: { message, data: Array<{ _id, id, caseId, internship_id, title, ... }> }
   */
  async findCasesByInternship(internshipId: string, user: JWTUserPayload) {
    this.logger.log(`[Cases] Finding cases for internship: ${internshipId}, user: ${user.id}, school_id: ${user.school_id}`);

    // Validate internshipId is a valid MongoDB ObjectId (24 hex chars)
    if (!internshipId || !Types.ObjectId.isValid(internshipId)) {
      this.logger.warn(`[Cases] Invalid internshipId: "${internshipId}" (must be 24-char hex ObjectId)`);
      throw new BadRequestException(
        'Invalid internship ID. Use the internship _id from GET /api/internship.',
      );
    }

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    this.logger.log(`[Cases] Using tenant DB: ${school.db_name}`);

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

      if (cases.length === 0) {
        this.logger.warn(
          `[Cases] No cases found for internshipId=${internshipId} in DB ${school.db_name}. ` +
            'Check: (1) internshipId is the internship _id from GET /api/internship, (2) cases exist in tenant DB collection.',
        );
      } else {
        this.logger.log(`[Cases] Found ${cases.length} case(s) for internship ${internshipId}`);
      }

      // Filter sensitive fields for students and normalize _id/id/caseId for all roles
      let filteredCases: any[] = cases;
      if (user.role.name === RoleEnum.STUDENT) {
        filteredCases = cases.map(caseData =>
          this.normalizeCaseForResponse({
            _id: caseData._id,
            internship_id: caseData.internship_id,
            title: caseData.title,
            description: caseData.description,
            case_documents: caseData.case_documents || [],
            sequence: caseData.sequence,
            created_by: caseData.created_by,
            created_at: caseData.created_at,
            updated_at: caseData.updated_at,
            difficulty: caseData.patient_simulation_config?.difficulty_level || null,
          }),
        );
      } else {
        filteredCases = cases.map(caseData => this.normalizeCaseForResponse(caseData));
      }

      return {
        message: 'Cases retrieved successfully',
        data: filteredCases,
      };
    } catch (error) {
      this.logger.error(
        `[Cases] Error finding cases for internship ${internshipId}:`,
        error?.stack || error,
      );
      throw new BadRequestException('Failed to retrieve cases');
    }
  }

  /**
   * Get single case by ID
   * Response data includes _id, id, and caseId for frontend compatibility.
   */
  async findCaseById(caseId: string, user: JWTUserPayload) {
    this.logger.log(`[Cases] Finding case by id: ${caseId}`);

    if (!caseId || !Types.ObjectId.isValid(caseId)) {
      this.logger.warn(`[Cases] Invalid caseId: "${caseId}"`);
      throw new BadRequestException(
        'Invalid case ID. Use the case _id or id from GET /api/internship/:internshipId/cases.',
      );
    }

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
        this.logger.warn(`[Cases] Case not found: ${caseId} in DB ${school.db_name}`);
        throw new NotFoundException('Case not found');
      }

      // Attach user details
      const caseWithUser = await attachUserDetailsToEntity(
        caseData,
        this.userModel,
      );

      // Filter sensitive fields for students
      // Students should only see: title, description, case_documents, and sequence
      // They should NOT see: case_content (the prompt), supervisor_prompts, therapist_prompts,
      // evaluation_criteria, or patient_simulation_config (internal AI configuration)
      if (user.role.name === RoleEnum.STUDENT) {
        const studentSafeCase = this.normalizeCaseForResponse({
          _id: caseWithUser._id,
          internship_id: caseWithUser.internship_id,
          title: caseWithUser.title,
          description: caseWithUser.description,
          case_documents: caseWithUser.case_documents || [],
          sequence: caseWithUser.sequence,
          created_by: caseWithUser.created_by,
          created_at: caseWithUser.created_at,
          updated_at: caseWithUser.updated_at,
          difficulty: caseWithUser.patient_simulation_config?.difficulty_level || null,
        });

        return {
          message: 'Case retrieved successfully',
          data: studentSafeCase,
        };
      }

      return {
        message: 'Case retrieved successfully',
        data: this.normalizeCaseForResponse(caseWithUser),
      };
    } catch (error) {
      this.logger.error(`[Cases] Error finding case ${caseId}:`, error?.stack || error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
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
      // Normalize patient_simulation_config to ensure enum values are in English
      const normalizedDto = { ...updateCaseDto };
      if (normalizedDto.patient_simulation_config) {
        normalizedDto.patient_simulation_config = normalizePatientSimulationConfig(
          normalizedDto.patient_simulation_config
        );
        this.logger.log(
          `Normalized patient_simulation_config: scenario_type=${normalizedDto.patient_simulation_config?.scenario_type}, difficulty_level=${normalizedDto.patient_simulation_config?.difficulty_level}`
        );
      }

      const updatedCase = await CaseModel.findOneAndUpdate(
        { _id: new Types.ObjectId(caseId), deleted_at: null },
        { ...normalizedDto, updated_at: new Date() },
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

  /**
   * Upload document to S3 and attach to case
   */
  async uploadCaseDocument(
    uploadDto: UploadCaseDocumentDto,
    user: JWTUserPayload,
  ) {
    this.logger.log(`Uploading document for case: ${uploadDto.case_id}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const CaseModel = tenantConnection.model(InternshipCase.name, InternshipCaseSchema);

    try {
      // Verify case exists and user has access
      const caseData = await CaseModel.findOne({
        _id: new Types.ObjectId(uploadDto.case_id),
        deleted_at: null,
      });

      if (!caseData) {
        throw new NotFoundException('Case not found');
      }

      // Decode base64 file content
      const fileBuffer = Buffer.from(uploadDto.file_content, 'base64');

      // Upload to S3
      const s3Result = await this.s3Service.uploadDocument(fileBuffer, {
        name: uploadDto.file_name,
        type: uploadDto.mime_type,
        size: uploadDto.file_size || fileBuffer.length,
        case_id: uploadDto.case_id,
      });

      // Add document to case
      const documentEntry = {
        url: s3Result.public_url,
        s3_key: s3Result.s3_key,
        type: uploadDto.mime_type,
        name: uploadDto.file_name,
        size: uploadDto.file_size || fileBuffer.length,
        uploaded_at: new Date(),
      };

      caseData.case_documents.push(documentEntry);
      await caseData.save();

      this.logger.log(`Document uploaded and attached to case: ${uploadDto.case_id}`);

      // Re-ingest case to Python AI with new document
      try {
        await this.pythonInternshipService.ingestCase({
          case_id: caseData._id.toString(),
          case_title: caseData.title,
          case_content: caseData.case_content || '',
          case_documents: caseData.case_documents.map(doc => ({
            url: doc.url,
            type: doc.type,
            name: doc.name,
          })),
          metadata: {
            created_by: user.id,
            internship_id: caseData.internship_id.toString(),
            difficulty: caseData.patient_simulation_config?.difficulty_level,
            condition: caseData.patient_simulation_config?.patient_profile?.condition,
            updated_at: new Date(),
          },
        });

        // Mark as ingested
        await CaseModel.updateOne(
          { _id: caseData._id },
          { 
            pinecone_ingested: true,
            pinecone_ingested_at: new Date(),
          }
        );

        this.logger.log(`Case ${caseData._id} re-ingested to Pinecone with new document`);
      } catch (error) {
        this.logger.error(`Failed to re-ingest case to Pinecone: ${error.message}`);
        // Don't fail the operation - document is already uploaded to S3
      }

      return {
        message: 'Document uploaded successfully',
        data: {
          document: documentEntry,
          case_id: caseData._id,
        },
      };
    } catch (error) {
      this.logger.error('Error uploading document', error?.stack || error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to upload document');
    }
  }

  /**
   * Get presigned URL for document download
   */
  async getDocumentUrl(
    caseId: string,
    documentIndex: number,
    user: JWTUserPayload,
  ) {
    this.logger.log(`Getting document URL for case: ${caseId}, document: ${documentIndex}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection
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

      // Check if document exists
      if (!caseData.case_documents || !caseData.case_documents[documentIndex]) {
        throw new NotFoundException('Document not found');
      }

      const document = caseData.case_documents[documentIndex];

      // If document has S3 key, generate presigned URL
      if (document.s3_key) {
        const presignedUrl = await this.s3Service.getPresignedUrl(document.s3_key, 3600); // 1 hour

        return {
          message: 'Document URL generated successfully',
          data: {
            url: presignedUrl,
            name: document.name,
            type: document.type,
            size: document.size,
            expires_in: 3600,
          },
        };
      }

      // Fallback: return the stored URL (for old documents without S3)
      return {
        message: 'Document URL retrieved successfully',
        data: {
          url: document.url,
          name: document.name,
          type: document.type,
          size: document.size,
        },
      };
    } catch (error) {
      this.logger.error('Error getting document URL', error?.stack || error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to get document URL');
    }
  }

  /**
   * Delete document from case and S3
   */
  async deleteDocument(
    caseId: string,
    documentIndex: number,
    user: JWTUserPayload,
  ) {
    this.logger.log(`Deleting document from case: ${caseId}, document: ${documentIndex}`);

    // Validate school exists
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const CaseModel = tenantConnection.model(InternshipCase.name, InternshipCaseSchema);

    try {
      const caseData = await CaseModel.findOne({
        _id: new Types.ObjectId(caseId),
        deleted_at: null,
      });

      if (!caseData) {
        throw new NotFoundException('Case not found');
      }

      // Check if document exists
      if (!caseData.case_documents || !caseData.case_documents[documentIndex]) {
        throw new NotFoundException('Document not found');
      }

      const document = caseData.case_documents[documentIndex];

      // Delete from S3 if it has S3 key
      if (document.s3_key) {
        await this.s3Service.deleteDocument(document.s3_key);
      }

      // Remove from array
      caseData.case_documents.splice(documentIndex, 1);
      await caseData.save();

      this.logger.log(`Document deleted from case: ${caseId}`);

      return {
        message: 'Document deleted successfully',
      };
    } catch (error) {
      this.logger.error('Error deleting document', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete document');
    }
  }
}

