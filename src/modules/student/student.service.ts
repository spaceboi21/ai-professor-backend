import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { User } from 'src/database/schemas/central/user.schema';
import { School } from 'src/database/schemas/central/school.schema';
import {
  Student,
  StudentSchema,
} from 'src/database/schemas/tenant/student.schema';
import { GlobalStudent } from 'src/database/schemas/central/global-student.schema';
import { BcryptUtil } from 'src/common/utils/bcrypt.util';
import { TenantConnectionService } from 'src/database/tenant-connection.service';
import { MailService } from 'src/mail/mail.service';
import { EmailUtil } from 'src/common/utils/email.util';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { BulkCreateResult, StudentCsvRow } from './dto/bulk-create-student.dto';
import { ResetStudentPasswordDto } from './dto/reset-password.dto';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { createPaginationResult, getPaginationOptions } from 'src/common/utils';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { StatusEnum } from 'src/common/constants/status.constant';
import * as csv from 'csv-parser';
import { Readable } from 'stream';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import { EmailEncryptionService } from 'src/common/services/email-encryption.service';
import {
  DEFAULT_LANGUAGE,
  LanguageEnum,
} from 'src/common/constants/language.constant';

@Injectable()
export class StudentService {
  private readonly logger = new Logger(StudentService.name);
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    @InjectModel(GlobalStudent.name)
    private readonly globalStudentModel: Model<GlobalStudent>,
    private readonly bcryptUtil: BcryptUtil,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly mailService: MailService,
    @InjectConnection() private readonly connection: Connection,
    private readonly errorMessageService: ErrorMessageService,
    private readonly emailEncryptionService: EmailEncryptionService,
  ) {}

  async createStudent(
    createStudentDto: CreateStudentDto,
    adminUser: JWTUserPayload,
  ) {
    const {
      first_name,
      last_name,
      email,
      school_id,
      status,
      preferred_language,
    } = createStudentDto;

    this.logger.log(
      `Creating student with email: ${email} for school: ${school_id}`,
    );

    // Determine school_id based on user role
    let targetSchoolId: string;

    if (adminUser.role.name === RoleEnum.SCHOOL_ADMIN) {
      // School admin can only access their own school
      targetSchoolId = adminUser.school_id as string;
      if (!targetSchoolId) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'SCHOOL',
            'ADMIN_MUST_HAVE_SCHOOL_ID',
            adminUser?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
    } else if (adminUser.role.name === RoleEnum.SUPER_ADMIN) {
      // Super admin can specify school_id or use their default
      targetSchoolId = school_id?.toString() || (adminUser.school_id as string);
      if (!targetSchoolId) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'STUDENT',
            'SUPER_ADMIN_SCHOOL_ID_REQUIRED',
            adminUser?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
    } else {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'UNAUTHORIZED_ACCESS',
          adminUser?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Validate school exists and admin has access
    const school = await this.schoolModel.findById(
      new Types.ObjectId(targetSchoolId),
    );
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          adminUser?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // If admin is SCHOOL_ADMIN, ensure they belong to this school
    if (adminUser.role.name === RoleEnum.SCHOOL_ADMIN) {
      if (adminUser.school_id?.toString() !== targetSchoolId.toString()) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'STUDENT',
            'ONLY_CREATE_FOR_OWN_SCHOOL',
            adminUser?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
    }

    // Check if email already exists in central users
    const encryptedEmail = this.emailEncryptionService.encryptEmail(email);
    const existingUser = await this.userModel.findOne({ email: encryptedEmail });
    if (existingUser) {
      throw new ConflictException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'EMAIL_EXISTS_SYSTEM',
          adminUser?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Check if email exists in global students (including deleted ones)
    const existingGlobalStudent = await this.globalStudentModel.findOne({
      email: encryptedEmail,
    });

    if (existingGlobalStudent) {
      // Check if the student is deleted in the tenant database
      const tenantConnection =
        await this.tenantConnectionService.getTenantConnection(school.db_name);
      const StudentModel = tenantConnection.model(Student.name, StudentSchema);

      const deletedStudent = await StudentModel.findOne({
        _id: existingGlobalStudent.student_id,
        deleted_at: { $ne: null },
      });

      if (deletedStudent) {
        // Remove the deleted student entries from both global and tenant databases
        this.logger.log(`Removing deleted student entry for email: ${email}`);

        await Promise.all([
          this.globalStudentModel.deleteOne({ email }),
          StudentModel.deleteOne({ _id: existingGlobalStudent.student_id }),
        ]);

        this.logger.log(`Deleted student entries removed for email: ${email}`);
      } else {
        // Student exists and is not deleted
        throw new ConflictException(
          this.errorMessageService.getMessageWithLanguage(
            'STUDENT',
            'EMAIL_EXISTS',
            adminUser?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
    }

    // Generate a random password
    const generatedPassword = this.bcryptUtil.generateStrongPassword();
    const hashedPassword =
      await this.bcryptUtil.hashPassword(generatedPassword);

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);

    try {
      // Double-check email uniqueness in tenant database
      const existingTenantStudent = await StudentModel.findOne({ email: encryptedEmail });
      if (existingTenantStudent) {
        throw new ConflictException(
          this.errorMessageService.getMessageWithLanguage(
            'STUDENT',
            'EMAIL_EXISTS_IN_SCHOOL',
            adminUser?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Create student in tenant database
      const newStudent = new StudentModel({
        first_name,
        last_name,
        email: encryptedEmail,
        password: hashedPassword,
        student_code: `${school.name
          .toLowerCase()
          .replace(/\s+/g, '')}-${Date.now()}`, // Generate school-specific student code
        school_id: new Types.ObjectId(targetSchoolId),
        status: status || StatusEnum.ACTIVE, // Use provided status or default to ACTIVE
        created_by: new Types.ObjectId(adminUser?.id),
        created_by_role: adminUser.role.name as RoleEnum,
        is_csv_upload: false, // Mark as non-CSV upload
        preferred_language: preferred_language || DEFAULT_LANGUAGE, // Use provided language or default
      });

      const savedStudent = await newStudent.save();

      this.logger.log(`Student created in tenant DB: ${savedStudent._id}`);

      // Create entry in global students collection
      await this.globalStudentModel.create({
        student_id: savedStudent._id,
        email: encryptedEmail,
        school_id: new Types.ObjectId(targetSchoolId),
      });

      this.logger.log(`Global student entry created for: ${email}`);

      // Send credentials email with preferred language from DTO
      await this.mailService.queueCredentialsEmail(
        email,
        `${first_name}${last_name ? ` ${last_name}` : ''}`,
        generatedPassword,
        RoleEnum.STUDENT,
        preferred_language || adminUser?.preferred_language,
      );

      this.logger.log(`Credentials email queued for: ${email}`);

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'STUDENT',
          'CREATED_SUCCESSFULLY',
          adminUser?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: {
          id: savedStudent._id,
          first_name: savedStudent.first_name,
          last_name: savedStudent.last_name,
          email: savedStudent.email,
          student_code: savedStudent.student_code,
          school_id: savedStudent.school_id,
          status: savedStudent.status,
          created_at: savedStudent.created_at,
        },
      };
    } catch (error) {
      this.logger.error('Error creating student', error?.stack || error);
      if (error?.code === 11000) {
        throw new ConflictException(
          this.errorMessageService.getMessageWithLanguage(
            'STUDENT',
            'EMAIL_EXISTS',
            adminUser?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'CREATE_FAILED',
          adminUser?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  async getAllStudents(
    paginationDto: PaginationDto,
    user: JWTUserPayload,
    search?: string,
    status?: string,
    school_id?: string,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ) {
    this.logger.log('Getting all students with filters');

    const { page, limit } = getPaginationOptions(paginationDto);

    // Determine school_id based on user role
    let targetSchoolId: string;
    let school: any;

    if (user.role.name === RoleEnum.SCHOOL_ADMIN) {
      // School admin can only access their own school
      targetSchoolId = user.school_id as string;
      if (!targetSchoolId) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'SCHOOL',
            'ADMIN_MUST_HAVE_SCHOOL_ID',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
    } else if (
      user.role.name === RoleEnum.SUPER_ADMIN ||
      user.role.name === RoleEnum.PROFESSOR
    ) {
      // Super admin can specify school_id or use their default
      targetSchoolId = school_id?.toString() || (user.school_id as string);
      if (!targetSchoolId) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'STUDENT',
            'SUPER_ADMIN_SCHOOL_ID_REQUIRED',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
    } else {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'UNAUTHORIZED_ACCESS',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
    // Get school information
    school = await this.schoolModel.findById(
      new Types.ObjectId(targetSchoolId),
    );
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);

    // Build filter query
    const filter: any = {
      deleted_at: null,
      school_id: new Types.ObjectId(targetSchoolId),
    };

    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { student_code: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    // Build sort object
    const sort: any = {};
    if (sortBy) {
      const order = sortOrder === 'desc' ? -1 : 1;
      sort[sortBy] = order;
    } else {
      // Default sorting by created_at descending (newest first)
      sort.created_at = -1;
    }

    const [students, total] = await Promise.all([
      StudentModel.aggregate([
        { $match: filter },
        {
          $addFields: {
            name: {
              $concat: [
                '$first_name',
                {
                  $cond: {
                    if: '$last_name',
                    then: { $concat: [' ', '$last_name'] },
                    else: '',
                  },
                },
              ],
            },
          },
        },
        { $sort: sort },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ]),
      StudentModel.countDocuments(filter),
    ]);

    // Decrypt emails in the aggregation results
    const decryptedStudents = students.map(student => 
      this.emailEncryptionService.decryptEmailFields(student, ['email'])
    );

    const pagination = createPaginationResult(decryptedStudents, total, {
      page,
      limit,
      skip: (page - 1) * limit,
    });

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'STUDENT',
        'STUDENTS_RETRIEVED_SUCCESSFULLY',
        user?.preferred_language || DEFAULT_LANGUAGE,
      ),
      ...pagination,
    };
  }

  async getStudentById(
    id: Types.ObjectId,
    user: JWTUserPayload,
    school_id?: string,
  ) {
    this.logger.log(`Getting student by ID: ${id}`);

    // Determine school_id based on user role
    let targetSchoolId: string;
    let school: any;

    if (user.role.name === RoleEnum.SCHOOL_ADMIN) {
      // School admin can only access their own school
      targetSchoolId = user.school_id as string;
      if (!targetSchoolId) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'SCHOOL',
            'ADMIN_MUST_HAVE_SCHOOL_ID',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
    } else if (user.role.name === RoleEnum.SUPER_ADMIN) {
      // Super admin can specify school_id or use their default
      targetSchoolId = school_id?.toString() || (user.school_id as string);
      if (!targetSchoolId) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'STUDENT',
            'SUPER_ADMIN_SCHOOL_ID_REQUIRED',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
    } else {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'UNAUTHORIZED_ACCESS',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get school information
    school = await this.schoolModel.findById(
      new Types.ObjectId(targetSchoolId),
    );
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);

    const student = await StudentModel.findOne({
      _id: new Types.ObjectId(id),
      deleted_at: null,
      school_id: new Types.ObjectId(targetSchoolId),
    }).lean();

    if (!student) {
      this.logger.warn(`Student not found: ${id}`);
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'STUDENT',
        'RETRIEVED_SUCCESSFULLY',
        user?.preferred_language || DEFAULT_LANGUAGE,
      ),
      data: student,
    };
  }

  async updateStudent(
    id: Types.ObjectId,
    updateStudentDto: UpdateStudentDto,
    user: JWTUserPayload,
    school_id?: string,
  ) {
    this.logger.log(`Updating student: ${id}`);

    // Determine school_id based on user role
    let targetSchoolId: string;
    let school: any;

    if (user.role.name === RoleEnum.SCHOOL_ADMIN) {
      // School admin can only access their own school
      targetSchoolId = user.school_id as string;
      if (!targetSchoolId) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'SCHOOL',
            'ADMIN_MUST_HAVE_SCHOOL_ID',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
    } else if (user.role.name === RoleEnum.SUPER_ADMIN) {
      // Super admin can specify school_id or use their default
      targetSchoolId = school_id?.toString() || (user.school_id as string);
      if (!targetSchoolId) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'STUDENT',
            'SUPER_ADMIN_SCHOOL_ID_REQUIRED',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
    } else {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'UNAUTHORIZED_ACCESS',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get school information
    school = await this.schoolModel.findById(
      new Types.ObjectId(targetSchoolId),
    );
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);

    // Find the student
    const student = await StudentModel.findOne({
      _id: new Types.ObjectId(id),
      deleted_at: null,
      school_id: new Types.ObjectId(targetSchoolId),
    }).select('+password');

    if (!student) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Store original email for comparison
    const originalEmail = student.email;
    let shouldSendEmail = false;
    let newPassword = '';
    let encryptedNewEmail: string | undefined;

    // If email is being updated, check for conflicts
    if (updateStudentDto.email && updateStudentDto.email !== student.email) {
      encryptedNewEmail = this.emailEncryptionService.encryptEmail(updateStudentDto.email);
      
      // Check if email already exists in central users
      const existingUser = await this.userModel.findOne({
        email: encryptedNewEmail,
        _id: { $ne: new Types.ObjectId(id) },
      });
      if (existingUser) {
        throw new ConflictException(
          this.errorMessageService.getMessageWithLanguage(
            'STUDENT',
            'EMAIL_EXISTS_SYSTEM',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Check if email already exists in global students
      const existingGlobalStudent = await this.globalStudentModel.findOne({
        email: encryptedNewEmail,
        student_id: { $ne: new Types.ObjectId(id) },
      });
      if (existingGlobalStudent) {
        // Check if the student is deleted in the tenant database
        const studentSchool = await this.schoolModel.findById(
          existingGlobalStudent.school_id,
        );
        if (studentSchool) {
          const tenantConnection =
            await this.tenantConnectionService.getTenantConnection(
              studentSchool.db_name,
            );
          const StudentModel = tenantConnection.model(
            Student.name,
            StudentSchema,
          );

          const deletedStudent = await StudentModel.findOne({
            _id: existingGlobalStudent.student_id,
            deleted_at: { $ne: null },
          });

          if (deletedStudent) {
            // Remove the deleted student entries from both global and tenant databases
            this.logger.log(
              `Removing deleted student entry for email: ${updateStudentDto.email}`,
            );

            await Promise.all([
              this.globalStudentModel.deleteOne({
                email: encryptedNewEmail,
              }),
              StudentModel.deleteOne({ _id: existingGlobalStudent.student_id }),
            ]);

            this.logger.log(
              `Deleted student entries removed for email: ${updateStudentDto.email}`,
            );
          } else {
            // Student exists and is not deleted
            throw new ConflictException(
              this.errorMessageService.getMessageWithLanguage(
                'STUDENT',
                'EMAIL_EXISTS',
                user?.preferred_language || DEFAULT_LANGUAGE,
              ),
            );
          }
        } else {
          // If school doesn't exist, remove the orphaned global entry
          await this.globalStudentModel.deleteOne({
            email: encryptedNewEmail,
          });
          this.logger.log(
            `Removed orphaned global student entry for email: ${updateStudentDto.email}`,
          );
        }
      }

      // Check if email already exists in tenant database
      const existingTenantStudent = await StudentModel.findOne({
        email: encryptedNewEmail,
        _id: { $ne: new Types.ObjectId(id) },
      });
      if (existingTenantStudent) {
        // Check if the student is deleted
        if (existingTenantStudent.deleted_at) {
          // Remove the deleted student entry
          this.logger.log(
            `Removing deleted student entry for email: ${updateStudentDto.email} in current school`,
          );

          await Promise.all([
            StudentModel.deleteOne({ _id: existingTenantStudent._id }),
            this.globalStudentModel.deleteOne({
              email: updateStudentDto.email,
            }),
          ]);

          this.logger.log(
            `Deleted student entry removed for email: ${updateStudentDto.email}`,
          );
        } else {
          // Student exists and is not deleted
          throw new ConflictException(
            this.errorMessageService.getMessageWithLanguage(
              'STUDENT',
              'EMAIL_EXISTS_IN_SCHOOL',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
          );
        }
      }

      // Generate new password for email update
      newPassword = this.bcryptUtil.generateStrongPassword();
      const hashedPassword = await this.bcryptUtil.hashPassword(newPassword);
      student.password = hashedPassword;
      shouldSendEmail = true;
    }

    // Update fields if provided
    if (updateStudentDto.first_name !== undefined) {
      student.first_name = updateStudentDto.first_name;
    }
    if (updateStudentDto.last_name !== undefined) {
      student.last_name = updateStudentDto.last_name;
    }
    if (updateStudentDto.email !== undefined) {
      student.email = encryptedNewEmail || this.emailEncryptionService.encryptEmail(updateStudentDto.email);
    }
    if (updateStudentDto.status !== undefined) {
      student.status = updateStudentDto.status;
    }

    // Save the updated student
    try {
      const updatedStudent = await student.save();

      // Update global student entry if email was changed
      if (updateStudentDto.email && updateStudentDto.email !== originalEmail) {
        await this.globalStudentModel.updateOne(
          { student_id: new Types.ObjectId(id) },
          { email: encryptedNewEmail || this.emailEncryptionService.encryptEmail(updateStudentDto.email) },
        );
      }

      // Send email notification if email was updated
      if (shouldSendEmail && updateStudentDto.email) {
        await this.mailService.queueCredentialsEmail(
          updateStudentDto.email,
          `${updatedStudent.first_name}${updatedStudent.last_name ? ` ${updatedStudent.last_name}` : ''}`,
          newPassword,
          RoleEnum.STUDENT,
          user?.preferred_language,
        );

        this.logger.log(
          `Credentials email queued for updated email: ${updateStudentDto.email}`,
        );
      }

      this.logger.log(`Student updated successfully: ${id}`);

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'STUDENT',
          'UPDATED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: {
          id: updatedStudent._id,
          first_name: updatedStudent.first_name,
          last_name: updatedStudent.last_name,
          email: updatedStudent.email,
          student_code: updatedStudent.student_code,
          school_id: updatedStudent.school_id,
          status: updatedStudent.status,
          updated_at: updatedStudent.updated_at,
        },
      };
    } catch (error) {
      this.logger.error('Error updating student', error?.stack || error);
      if (error?.code === 11000) {
        throw new ConflictException(
          this.errorMessageService.getMessageWithLanguage(
            'STUDENT',
            'EMAIL_EXISTS',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'UPDATE_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  async deleteStudent(
    id: Types.ObjectId,
    user: JWTUserPayload,
    school_id?: string,
  ) {
    this.logger.log(`Deleting student: ${id}`);

    // Determine school_id based on user role
    let targetSchoolId: string;
    let school: any;

    if (user.role.name === RoleEnum.SCHOOL_ADMIN) {
      // School admin can only access their own school
      targetSchoolId = user.school_id as string;
      if (!targetSchoolId) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'SCHOOL',
            'ADMIN_MUST_HAVE_SCHOOL_ID',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
    } else if (user.role.name === RoleEnum.SUPER_ADMIN) {
      // Super admin can specify school_id or use their default
      targetSchoolId = school_id?.toString() || (user.school_id as string);
      if (!targetSchoolId) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'STUDENT',
            'SUPER_ADMIN_SCHOOL_ID_REQUIRED',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
    } else {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'UNAUTHORIZED_ACCESS',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get school information
    school = await this.schoolModel.findById(
      new Types.ObjectId(targetSchoolId),
    );
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);

    // Find the student
    const student = await StudentModel.findOne({
      _id: new Types.ObjectId(id),
      deleted_at: null,
      school_id: new Types.ObjectId(targetSchoolId),
    });

    if (!student) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Soft delete the student
    try {
      const deletedStudent = await StudentModel.findByIdAndUpdate(
        id,
        {
          deleted_at: new Date(),
          status: StatusEnum.INACTIVE,
        },
        { new: true },
      );

      if (!deletedStudent) {
        throw new NotFoundException(
          this.errorMessageService.getMessageWithLanguage(
            'STUDENT',
            'NOT_FOUND_OR_ALREADY_DELETED',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }

      // Also soft delete from global students collection
      await this.globalStudentModel.updateOne(
        { student_id: new Types.ObjectId(id) },
        { deleted_at: new Date() },
      );

      this.logger.log(`Student deleted successfully: ${id}`);

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'STUDENT',
          'DELETED_SUCCESSFULLY',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
        data: {
          id: deletedStudent._id,
          email: deletedStudent.email,
          first_name: deletedStudent.first_name,
          last_name: deletedStudent.last_name,
          deleted_at: deletedStudent.deleted_at,
        },
      };
    } catch (error) {
      this.logger.error('Error deleting student', error?.stack || error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'DELETE_FAILED',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }
  }

  async updateStudentStatus(
    id: Types.ObjectId,
    status: StatusEnum,
    user: JWTUserPayload,
    school_id?: string,
  ) {
    this.logger.log(`Updating student status: ${id} to ${status}`);

    // Determine school_id based on user role
    let targetSchoolId: string;
    let school: any;

    if (user.role.name === RoleEnum.SCHOOL_ADMIN) {
      // School admin can only access their own school
      targetSchoolId = user.school_id as string;
      if (!targetSchoolId) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'SCHOOL',
            'ADMIN_MUST_HAVE_SCHOOL_ID',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
    } else if (user.role.name === RoleEnum.SUPER_ADMIN) {
      // Super admin can specify school_id or use their default
      targetSchoolId = school_id?.toString() || (user.school_id as string);
      if (!targetSchoolId) {
        throw new BadRequestException(
          this.errorMessageService.getMessageWithLanguage(
            'STUDENT',
            'SUPER_ADMIN_SCHOOL_ID_REQUIRED',
            user?.preferred_language || DEFAULT_LANGUAGE,
          ),
        );
      }
    } else {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'UNAUTHORIZED_ACCESS',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get school information
    school = await this.schoolModel.findById(
      new Types.ObjectId(targetSchoolId),
    );
    if (!school) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);

    // Find and update student in tenant database
    const student = await StudentModel.findOne({
      _id: new Types.ObjectId(id),
      deleted_at: null,
      school_id: new Types.ObjectId(targetSchoolId),
    });

    if (!student) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const updatedStudent = await StudentModel.findByIdAndUpdate(
      new Types.ObjectId(id),
      { status },
      { new: true },
    );

    if (!updatedStudent) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'NOT_FOUND_AFTER_UPDATE',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    this.logger.log(`Student status updated successfully: ${id} to ${status}`);
    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'STUDENT',
        'STATUS_UPDATED_SUCCESSFULLY',
        user?.preferred_language || DEFAULT_LANGUAGE,
      ),
      data: {
        id: updatedStudent._id,
        email: updatedStudent.email,
        first_name: updatedStudent.first_name,
        last_name: updatedStudent.last_name,
        status: updatedStudent.status,
      },
    };
  }

  async bulkCreateStudents(
    fileBuffer: Buffer,
    adminUser: JWTUserPayload,
    school_id?: string,
  ): Promise<BulkCreateResult> {
    this.logger.log(
      `Bulk creating students for user: ${adminUser.id}, role: ${adminUser.role.name}`,
    );

    const result: BulkCreateResult = {
      success: [],
      failed: [],
      total: 0,
      successCount: 0,
      failedCount: 0,
    };

    // Parse CSV file first to get all students
    const students: StudentCsvRow[] = [];
    const stream = Readable.from(fileBuffer);

    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (row) => {
          // Validate required fields
          if (!row.first_name || !row.email) {
            result.failed.push({
              row: {
                first_name: row.first_name || '',
                last_name: row.last_name || '',
                email: row.email || '',
              },
              error: this.errorMessageService.getMessageWithLanguage(
                'STUDENT',
                'MISSING_REQUIRED_FIELDS',
                adminUser?.preferred_language || DEFAULT_LANGUAGE,
              ),
            });
            return;
          }

          // Validate email format using common utility
          const emailValidation = EmailUtil.validateAndNormalizeEmail(
            row.email,
          );
          if (!emailValidation.isValid) {
            result.failed.push({
              row: {
                first_name: row.first_name,
                last_name: row.last_name || '',
                email: row.email,
              },
              error: this.errorMessageService.getMessageWithLanguage(
                'STUDENT',
                'INVALID_EMAIL_FORMAT',
                adminUser?.preferred_language || DEFAULT_LANGUAGE,
              ),
            });
            return;
          }

          students.push({
            first_name: row.first_name.trim(),
            last_name: (row.last_name || '').trim(),
            email: emailValidation.normalizedEmail!,
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    result.total = students.length;

    if (students.length === 0) {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'NO_VALID_STUDENT_DATA_FOUND',
          adminUser?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Check for duplicate emails within the CSV
    const emailCounts = new Map<string, number>();
    students.forEach((student) => {
      emailCounts.set(student.email, (emailCounts.get(student.email) || 0) + 1);
    });

    const duplicateEmails = Array.from(emailCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([email]) => email);

    // Mark duplicates as failed
    students.forEach((student) => {
      if (duplicateEmails.includes(student.email)) {
        result.failed.push({
          row: student,
          error: this.errorMessageService.getMessageWithLanguage(
            'STUDENT',
            'DUPLICATE_EMAIL_WITHIN_CSV',
            adminUser?.preferred_language || DEFAULT_LANGUAGE,
          ),
        });
      }
    });

    // Filter out duplicates for processing
    const uniqueStudents = students.filter(
      (student) => !duplicateEmails.includes(student.email),
    );

    // Check existing emails in central users and global students
    const existingEmails = new Set<string>();
    const existingCentralUsers = await this.userModel.find({
      email: { $in: uniqueStudents.map((s) => s.email) },
    });
    existingCentralUsers.forEach((user) => existingEmails.add(user.email));

    const existingGlobalStudents = await this.globalStudentModel.find({
      email: { $in: uniqueStudents.map((s) => s.email) },
    });

    // Check for deleted students and remove them
    const deletedStudentEmails = new Set<string>();
    for (const globalStudent of existingGlobalStudents) {
      // Find the school for this global student
      const studentSchool = await this.schoolModel.findById(
        globalStudent.school_id,
      );
      if (!studentSchool) {
        // If school doesn't exist, consider it as a deleted entry
        deletedStudentEmails.add(globalStudent.email);
        continue;
      }

      // Check if the student is deleted in the tenant database
      const tenantConnection =
        await this.tenantConnectionService.getTenantConnection(
          studentSchool.db_name,
        );
      const StudentModel = tenantConnection.model(Student.name, StudentSchema);

      const deletedStudent = await StudentModel.findOne({
        _id: globalStudent.student_id,
        deleted_at: { $ne: null },
      });

      if (deletedStudent) {
        deletedStudentEmails.add(globalStudent.email);
      } else {
        existingEmails.add(globalStudent.email);
      }
    }

    // Remove deleted student entries
    if (deletedStudentEmails.size > 0) {
      this.logger.log(
        `Removing ${deletedStudentEmails.size} deleted student entries`,
      );

      for (const email of deletedStudentEmails) {
        const globalStudent = existingGlobalStudents.find(
          (gs) => gs.email === email,
        );
        if (globalStudent) {
          const studentSchool = await this.schoolModel.findById(
            globalStudent.school_id,
          );
          if (studentSchool) {
            const tenantConnection =
              await this.tenantConnectionService.getTenantConnection(
                studentSchool.db_name,
              );
            const StudentModel = tenantConnection.model(
              Student.name,
              StudentSchema,
            );

            await Promise.all([
              this.globalStudentModel.deleteOne({ email }),
              StudentModel.deleteOne({ _id: globalStudent.student_id }),
            ]);
          } else {
            // If school doesn't exist, just remove from global
            await this.globalStudentModel.deleteOne({ email });
          }
        }
      }

      this.logger.log(`Deleted student entries removed`);
    }

    // Collect emails for queue processing
    const emailJobs: Array<{
      email: string;
      name: string;
      password: string;
      role: RoleEnum;
      preferredLanguage?: LanguageEnum;
    }> = [];

    // Process each student
    for (const student of uniqueStudents) {
      try {
        // Skip if email already exists
        if (existingEmails.has(student.email)) {
          result.failed.push({
            row: student,
            error: this.errorMessageService.getMessageWithLanguage(
              'STUDENT',
              'EMAIL_EXISTS_SYSTEM',
              adminUser?.preferred_language || DEFAULT_LANGUAGE,
            ),
          });
          continue;
        }

        // Determine school_id based on user role
        let schoolId: string;
        let school: any;

        if (adminUser.role.name === RoleEnum.SCHOOL_ADMIN) {
          // School admin can only create students for their own school
          schoolId = (adminUser.school_id as string) || '';
          school = await this.schoolModel.findById(
            new Types.ObjectId(schoolId),
          );
          if (!school) {
            result.failed.push({
              row: student,
              error: this.errorMessageService.getMessageWithLanguage(
                'STUDENT',
                'SCHOOL_NOT_FOUND_FOR_SCHOOL_ADMIN',
                adminUser?.preferred_language || DEFAULT_LANGUAGE,
              ),
            });
            continue;
          }
        } else if (adminUser.role.name === RoleEnum.SUPER_ADMIN) {
          // Super admin uses the provided school_id parameter
          schoolId = school_id || '';
          school = await this.schoolModel.findById(
            new Types.ObjectId(schoolId),
          );
          if (!school) {
            result.failed.push({
              row: student,
              error: this.errorMessageService.getMessageWithLanguage(
                'STUDENT',
                'SCHOOL_NOT_FOUND_WITH_ID',
                adminUser?.preferred_language || DEFAULT_LANGUAGE,
              ),
            });
            continue;
          }
        } else {
          result.failed.push({
            row: student,
            error: this.errorMessageService.getMessageWithLanguage(
              'STUDENT',
              'UNAUTHORIZED_ROLE_FOR_BULK_STUDENT_CREATION',
              adminUser?.preferred_language || DEFAULT_LANGUAGE,
            ),
          });
          continue;
        }

        // Get tenant connection for the school
        const tenantConnection =
          await this.tenantConnectionService.getTenantConnection(
            school.db_name,
          );
        const StudentModel = tenantConnection.model(
          Student.name,
          StudentSchema,
        );

        // Check existing emails in tenant database
        const existingTenantStudent = await StudentModel.findOne({
          email: student.email,
        });
        if (existingTenantStudent) {
          // Check if the student is deleted
          if (existingTenantStudent.deleted_at) {
            // Remove the deleted student entry
            this.logger.log(
              `Removing deleted student entry for email: ${student.email} in school: ${school.name}`,
            );

            await Promise.all([
              StudentModel.deleteOne({ _id: existingTenantStudent._id }),
              this.globalStudentModel.deleteOne({ email: student.email }),
            ]);

            this.logger.log(
              `Deleted student entry removed for email: ${student.email}`,
            );
          } else {
            // Student exists and is not deleted
            result.failed.push({
              row: student,
              error: this.errorMessageService.getMessageWithLanguage(
                'STUDENT',
                'EMAIL_EXISTS_IN_SCHOOL',
                adminUser?.preferred_language || DEFAULT_LANGUAGE,
              ),
            });
            continue;
          }
        }

        // Generate password and hash it
        const generatedPassword = this.bcryptUtil.generateStrongPassword();
        const hashedPassword =
          await this.bcryptUtil.hashPassword(generatedPassword);

        // Create student in tenant database
        const newStudent = new StudentModel({
          first_name: student.first_name,
          last_name: student.last_name,
          email: student.email,
          password: hashedPassword,
          student_code: `${school.name
            .toLowerCase()
            .replace(/\s+/g, '')}-${Date.now()}`, // Generate school-specific student code
          school_id: new Types.ObjectId(schoolId),
          created_by: new Types.ObjectId(adminUser?.id),
          created_by_role: adminUser.role.name as RoleEnum,
          is_csv_upload: true, // Mark as CSV upload
        });

        const savedStudent = await newStudent.save();

        // Create entry in global students collection
        await this.globalStudentModel.create({
          student_id: savedStudent._id,
          email: student.email,
          school_id: new Types.ObjectId(schoolId),
        });

        // Add email job to queue instead of sending directly
        emailJobs.push({
          email: student.email,
          name: `${student.first_name}${student.last_name ? ` ${student.last_name}` : ''}`,
          password: generatedPassword,
          role: RoleEnum.STUDENT,
          preferredLanguage: adminUser?.preferred_language,
        });

        result.success.push(student);
        result.successCount++;

        this.logger.log(
          `Student created successfully: ${student.email} for school: ${school.name}`,
        );
      } catch (error) {
        this.logger.error(`Error creating student ${student.email}:`, error);
        result.failed.push({
          row: student,
          error:
            error.message ||
            this.errorMessageService.getMessageWithLanguage(
              'STUDENT',
              'CREATE_FAILED',
              adminUser?.preferred_language || DEFAULT_LANGUAGE,
            ),
        });
        result.failedCount++;
      }
    }

    // Queue all emails for background processing
    if (emailJobs.length > 0) {
      try {
        await this.mailService.queueBulkCredentialsEmails(emailJobs);
        this.logger.log(
          `Queued ${emailJobs.length} email jobs for background processing`,
        );
      } catch (error) {
        this.logger.error('Failed to queue email jobs:', error);
        // Don't fail the entire operation if email queuing fails
      }
    }

    result.failedCount = result.failed.length;

    this.logger.log(
      `Bulk student creation completed. Success: ${result.successCount}, Failed: ${result.failedCount}`,
    );

    return result;
  }

  async resetPassword(
    userId: string,
    resetPasswordDto: ResetStudentPasswordDto,
  ) {
    const { old_password, new_password } = resetPasswordDto;
    this.logger.log(`Resetting password for student: ${userId}`);

    // Get the student's school information from JWT token
    // We need to get the school from the global student collection
    const globalStudent = await this.globalStudentModel.findOne({
      student_id: new Types.ObjectId(userId),
    });

    if (!globalStudent) {
      this.logger.warn(`Global student not found: ${userId}`);
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'NOT_FOUND',
          DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get the school information
    const school = await this.schoolModel.findById(globalStudent.school_id);
    if (!school) {
      this.logger.warn(`School not found for student: ${userId}`);
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'SCHOOL',
          'NOT_FOUND',
          DEFAULT_LANGUAGE,
        ),
      );
    }

    // Get tenant connection for the school
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);

    // Find the student in the tenant database
    const student = await StudentModel.findById(userId).select('+password');
    if (!student) {
      this.logger.warn(`Student not found in tenant DB: ${userId}`);
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'NOT_FOUND',
          DEFAULT_LANGUAGE,
        ),
      );
    }

    // Validate old password
    const isPasswordValid = await this.bcryptUtil.comparePassword(
      old_password,
      student.password,
    );

    if (!isPasswordValid) {
      this.logger.warn(`Invalid old password for student: ${userId}`);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'AUTH',
          'INVALID_OLD_PASSWORD',
          DEFAULT_LANGUAGE,
        ),
      );
    }

    // Hash the new password
    const hashedNewPassword = await this.bcryptUtil.hashPassword(new_password);

    // Update the password
    student.password = hashedNewPassword;
    student.last_logged_in = new Date();

    try {
      const updatedStudent = await student.save();
      this.logger.log(
        `Password updated successfully for student: ${student.email}`,
      );

      return {
        message: this.errorMessageService.getSuccessMessageWithLanguage(
          'STUDENT',
          'PASSWORD_UPDATED_SUCCESSFULLY',
          DEFAULT_LANGUAGE,
        ),
        data: {
          id: updatedStudent._id,
          email: updatedStudent.email,
          first_name: updatedStudent.first_name,
          last_name: updatedStudent.last_name,
          student_code: updatedStudent.student_code,
          school_id: updatedStudent.school_id,
          created_at: updatedStudent.created_at,
        },
      };
    } catch (error) {
      this.logger.error('Error updating student password:', error);
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'STUDENT',
          'PASSWORD_UPDATE_FAILED',
          DEFAULT_LANGUAGE,
        ),
      );
    }
  }
}
