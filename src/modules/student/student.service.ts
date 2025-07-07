import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
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

@Injectable()
export class StudentService {
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

      // Create entry in global students collection
      const globalStudent = await this.globalStudentModel.create({
        student_id: savedStudent._id,
        email,
        school_id: new Types.ObjectId(school_id),
      });

      // Send credentials email
      await this.mailService.sendCredentialsEmail(
        email,
        `${first_name}${last_name ? ` ${last_name}` : ''}`,
        generatedPassword,
        RoleEnum.STUDENT,
      );

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
      console.error('Error creating student:', error);

      if (error?.code === 11000) {
        throw new ConflictException('Email already exists');
      }

      throw new BadRequestException('Failed to create student');
    }
  }
}
