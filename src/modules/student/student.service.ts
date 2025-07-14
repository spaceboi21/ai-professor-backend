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
import { BulkCreateResult, StudentCsvRow } from './dto/bulk-create-student.dto';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { createPaginationResult, getPaginationOptions } from 'src/common/utils';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { StatusEnum } from 'src/common/constants/status.constant';
import * as csv from 'csv-parser';
import { Readable } from 'stream';

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
  ) {}

  async createStudent(
    createStudentDto: CreateStudentDto,
    adminUser: JWTUserPayload,
  ) {
    const { first_name, last_name, email, school_id } = createStudentDto;

    this.logger.log(
      `Creating student with email: ${email} for school: ${school_id}`,
    );

    // Validate school exists and admin has access
    const school = await this.schoolModel.findById(school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // If admin is SCHOOL_ADMIN, ensure they belong to this school
    if (adminUser.role.name === RoleEnum.SCHOOL_ADMIN) {
      if (adminUser.school_id !== school_id) {
        throw new BadRequestException(
          'You can only create students for your own school',
        );
      }
    }

    // Check if email already exists in central users
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('Email already exists in the system');
    }

    // Check if email already exists in global students
    const existingGlobalStudent = await this.globalStudentModel.findOne({
      email,
    });
    if (existingGlobalStudent) {
      throw new ConflictException('Student with this email already exists');
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
      const existingTenantStudent = await StudentModel.findOne({ email });
      if (existingTenantStudent) {
        throw new ConflictException(
          'Student with this email already exists in school database',
        );
      }

      // Create student in tenant database
      const newStudent = new StudentModel({
        first_name,
        last_name,
        email,
        password: hashedPassword,
        student_code: `${school.name
          .toLowerCase()
          .replace(/\s+/g, '')}-${Date.now()}`, // Generate school-specific student code
        school_id: new Types.ObjectId(school_id),
        created_by: new Types.ObjectId(adminUser?.id),
        created_by_role: adminUser.role.name as RoleEnum,
      });

      const savedStudent = await newStudent.save();

      this.logger.log(`Student created in tenant DB: ${savedStudent._id}`);

      // Create entry in global students collection
      await this.globalStudentModel.create({
        student_id: savedStudent._id,
        email,
        school_id: new Types.ObjectId(school_id),
      });

      this.logger.log(`Global student entry created for: ${email}`);

      // Send credentials email
      await this.mailService.queueCredentialsEmail(
        email,
        `${first_name}${last_name ? ` ${last_name}` : ''}`,
        generatedPassword,
        RoleEnum.STUDENT,
      );

      this.logger.log(`Credentials email queued for: ${email}`);

      return {
        message: 'Student created successfully',
        data: {
          id: savedStudent._id,
          first_name: savedStudent.first_name,
          last_name: savedStudent.last_name,
          email: savedStudent.email,
          student_code: savedStudent.student_code,
          school_id: savedStudent.school_id,
          created_at: savedStudent.created_at,
        },
      };
    } catch (error) {
      this.logger.error('Error creating student', error?.stack || error);
      if (error?.code === 11000) {
        throw new ConflictException('Email already exists');
      }
      throw new BadRequestException('Failed to create student');
    }
  }

  async getAllStudents(
    paginationDto: PaginationDto,
    user: JWTUserPayload,
    search?: string,
    status?: string,
  ) {
    this.logger.log('Getting all students with filters');

    const { page, limit } = getPaginationOptions(paginationDto);

    // Get school information for the authenticated school admin
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);

    // Build filter query
    const filter: any = {
      deleted_at: null,
      school_id: user?.school_id ? new Types.ObjectId(user.school_id) : null,
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

    const [students, total] = await Promise.all([
      StudentModel.find(filter)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      StudentModel.countDocuments(filter),
    ]);

    const pagination = createPaginationResult(students, total, {
      page,
      limit,
      skip: (page - 1) * limit,
    });

    return {
      message: 'Students retrieved successfully',
      ...pagination,
    };
  }

  async getStudentById(id: Types.ObjectId, user: JWTUserPayload) {
    this.logger.log(`Getting student by ID: ${id}`);

    // Get school information for the authenticated school admin
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);

    const student = await StudentModel.findOne({
      _id: id,
      deleted_at: null,
      school_id: user?.school_id ? new Types.ObjectId(user.school_id) : null,
    }).lean();

    if (!student) {
      this.logger.warn(`Student not found: ${id}`);
      throw new NotFoundException('Student not found');
    }

    return {
      message: 'Student retrieved successfully',
      data: student,
    };
  }

  async updateStudentStatus(
    id: Types.ObjectId,
    status: StatusEnum,
    user: JWTUserPayload,
  ) {
    this.logger.log(`School admin updating student status: ${id} to ${status}`);

    // Get school information for the authenticated school admin
    const school = await this.schoolModel.findById(user.school_id);
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get tenant connection
    const tenantConnection =
      await this.tenantConnectionService.getTenantConnection(school.db_name);
    const StudentModel = tenantConnection.model(Student.name, StudentSchema);

    // Find and update student in tenant database
    const student = await StudentModel.findById(id);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Verify the student belongs to the same school as the admin
    if (
      !user.school_id ||
      student.school_id.toString() !== user.school_id.toString()
    ) {
      throw new BadRequestException(
        'You can only manage students from your school',
      );
    }

    const updatedStudent = await StudentModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );

    if (!updatedStudent) {
      throw new NotFoundException('Student not found after update');
    }

    this.logger.log(`Student status updated successfully: ${id} to ${status}`);
    return {
      message: 'Student status updated successfully',
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
  ): Promise<BulkCreateResult> {
    this.logger.log(
      `Bulk creating students for school: ${adminUser.school_id}`,
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
              error:
                'Missing required fields: first_name and email are required',
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
              error: 'Invalid email format',
            });
            return;
          }

          // For SUPER_ADMIN, school_id is required if not provided in CSV
          if (
            adminUser.role.name === RoleEnum.SUPER_ADMIN &&
            !row.school_id &&
            !adminUser.school_id
          ) {
            result.failed.push({
              row: {
                first_name: row.first_name,
                last_name: row.last_name || '',
                email: row.email,
              },
              error:
                'Super admin must provide school_id in CSV or have a default school_id',
            });
            return;
          }

          students.push({
            first_name: row.first_name.trim(),
            last_name: (row.last_name || '').trim(),
            email: emailValidation.normalizedEmail!,
            school_id: row.school_id?.trim(),
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    result.total = students.length;

    if (students.length === 0) {
      throw new BadRequestException('No valid student data found in CSV file');
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
          error: 'Duplicate email within CSV file',
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
    existingGlobalStudents.forEach((student) =>
      existingEmails.add(student.email),
    );

    // Collect emails for queue processing
    const emailJobs: Array<{
      email: string;
      name: string;
      password: string;
      role: RoleEnum;
    }> = [];

    // Process each student
    for (const student of uniqueStudents) {
      try {
        // Skip if email already exists
        if (existingEmails.has(student.email)) {
          result.failed.push({
            row: student,
            error: 'Email already exists in the system',
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
              error: 'School not found for school admin',
            });
            continue;
          }

          // If school_id is provided in CSV, validate it matches the admin's school
          if (
            student.school_id &&
            student.school_id.toString() !== schoolId.toString()
          ) {
            result.failed.push({
              row: student,
              error:
                'School admin can only create students for their own school',
            });
            continue;
          }
        } else if (adminUser.role.name === RoleEnum.SUPER_ADMIN) {
          // Super admin can specify school_id in CSV or use default
          schoolId = student.school_id || (adminUser.school_id as string) || '';
          school = await this.schoolModel.findById(
            new Types.ObjectId(schoolId),
          );
          if (!school) {
            result.failed.push({
              row: student,
              error: `School not found with ID: ${schoolId}`,
            });
            continue;
          }
        } else {
          result.failed.push({
            row: student,
            error: 'Unauthorized role for bulk student creation',
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
          result.failed.push({
            row: student,
            error: 'Email already exists in school database',
          });
          continue;
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
          error: error.message || 'Failed to create student',
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
}
