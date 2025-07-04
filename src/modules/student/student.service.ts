import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/database/schemas/central/user.schema';
import { School } from 'src/database/schemas/central/school.schema';
import { BcryptUtil } from 'src/common/utils/bcrypt.util';

@Injectable()
export class StudentService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly bcryptUtil: BcryptUtil,
  ) {}
}
