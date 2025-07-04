import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
  ) {}

  async createStudent(
    createStudentDto: CreateStudentDto,
    adminUser: JWTUserPayload,
  ) {
    const { first_name, last_name, email, school_id } = createStudentDto;

    // Validate school exists
    const school = await this.schoolModel.findById(school_id);

    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Check if email already exists in central users
    const existingUser = await this.userModel.findOne({ email });

    if (existingUser) {
      throw new ConflictException('Email already exists');
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

    // Check if student_code already exists in tenant database
    const existingStudent = await StudentModel.findOne({ email });
    if (existingStudent) {
      throw new ConflictException('Student code already exists');
    }

    // Create student in tenant database
    const newStudent = new StudentModel({
      first_name,
      last_name,
      email,
      password: hashedPassword,
      student_code: `student-${Date.now()}`, // Generate a unique student code
      school_id: new Types.ObjectId(school_id),
      created_by: new Types.ObjectId(adminUser?.id),
      created_by_role: adminUser.role.name as RoleEnum,
    });

    const savedStudent = await newStudent.save();

    // Create entry in global students collection
    const globalStudent = new this.globalStudentModel({
      student_id: savedStudent._id,
      email,
      school_id: new Types.ObjectId(school_id),
    });

    await globalStudent.save();

    await this.mailService.sendCredentialsEmail(
      email,
      `${first_name} ${last_name}`,
      generatedPassword,
    );

    return {
      message: 'Student created successfully',
      data: savedStudent,
    };
  }
}
