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
import { CreateStudentDto } from './dto/create-student.dto';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { createPaginationResult, getPaginationOptions } from 'src/common/utils';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { StatusEnum } from 'src/common/constants/status.constant';

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
      await this.mailService.sendCredentialsEmail(
        email,
        `${first_name}${last_name ? ` ${last_name}` : ''}`,
        generatedPassword,
        RoleEnum.STUDENT,
      );

      this.logger.log(`Credentials email sent to: ${email}`);

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
    studentId: string,
    status: StatusEnum,
    user: JWTUserPayload,
  ) {
    this.logger.log(
      `School admin updating student status: ${studentId} to ${status}`,
    );

    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestException('Invalid student ID');
    }

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
    const student = await StudentModel.findById(studentId);
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
      studentId,
      { status },
      { new: true },
    );

    if (!updatedStudent) {
      throw new NotFoundException('Student not found after update');
    }

    this.logger.log(
      `Student status updated successfully: ${studentId} to ${status}`,
    );
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
}
