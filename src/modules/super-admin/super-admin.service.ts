import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/database/schemas/central/user.schema';
import { School } from 'src/database/schemas/central/school.schema';
import { StatusEnum } from 'src/common/constants/status.constant';
import { RoleEnum } from 'src/common/constants/roles.constant';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
  ) {}

  async updateUserStatus(userId: string, status: StatusEnum) {
    this.logger.log(`Updating user status: ${userId} to ${status}`);
    
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      this.logger.warn(`User not found: ${userId}`);
      throw new NotFoundException('User not found');
    }

    // Super admin cannot change their own status
    if (user.role.toString() === '6863cea411be9016b7ccb7fc') { // SUPER_ADMIN role ID
      throw new BadRequestException('Super admin cannot change their own status');
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { status },
      { new: true }
    ).populate('role', 'name');

    if (!updatedUser) {
      throw new NotFoundException('User not found after update');
    }

    this.logger.log(`User status updated successfully: ${userId} to ${status}`);
    return {
      message: 'User status updated successfully',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        status: updatedUser.status,
        role: updatedUser.role,
      },
    };
  }

  async updateSchoolStatus(schoolId: string, status: StatusEnum) {
    this.logger.log(`Updating school status: ${schoolId} to ${status}`);
    
    if (!Types.ObjectId.isValid(schoolId)) {
      throw new BadRequestException('Invalid school ID');
    }

    const school = await this.schoolModel.findById(schoolId);
    if (!school) {
      this.logger.warn(`School not found: ${schoolId}`);
      throw new NotFoundException('School not found');
    }

    const updatedSchool = await this.schoolModel.findByIdAndUpdate(
      schoolId,
      { status },
      { new: true }
    );

    if (!updatedSchool) {
      throw new NotFoundException('School not found after update');
    }

    this.logger.log(`School status updated successfully: ${schoolId} to ${status}`);
    return {
      message: 'School status updated successfully',
      school: {
        id: updatedSchool._id,
        name: updatedSchool.name,
        email: updatedSchool.email,
        status: updatedSchool.status,
      },
    };
  }
}
