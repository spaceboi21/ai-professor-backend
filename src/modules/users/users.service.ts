import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/database/schemas/central/user.schema';
import { StatusEnum } from 'src/common/constants/status.constant';
import { ROLE_IDS } from 'src/common/constants/roles.constant';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  getPaginationOptions,
  createPaginationResult,
} from 'src/common/utils/pagination.util';
import { ErrorMessageService } from 'src/common/services/error-message.service';
import { DEFAULT_LANGUAGE } from 'src/common/constants/language.constant';
import { JWTUserPayload } from 'src/common/types/jwr-user.type';
import { BcryptUtil } from 'src/common/utils';
import { EmailEncryptionService } from 'src/common/services/email-encryption.service';
import { Role } from 'src/database/schemas/central/role.schema';
import { School } from 'src/database/schemas/central/school.schema';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(Role.name)
    private readonly roleModel: Model<Role>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly errorMessageService: ErrorMessageService,
    private readonly bcryptUtil: BcryptUtil,
    private readonly emailEncryptionService: EmailEncryptionService,
  ) {}

  async getAllUsers(
    paginationDto: PaginationDto,
    search?: string,
    role?: string,
    status?: string,
    user?: JWTUserPayload,
  ) {
    this.logger.log('Getting all users with filters');

    const { page, limit } = getPaginationOptions(paginationDto);

    // Build filter query
    const filter: any = { deleted_at: null };

    // If user is school admin, filter by their school
    if (user && user.school_id && user.role.name === 'SCHOOL_ADMIN') {
      filter.school_id = new Types.ObjectId(user.school_id.toString());
      this.logger.log(`Filtering users for school: ${user.school_id}`);
    }

    if (search) {
      const encryptedSearch = this.emailEncryptionService.encryptEmail(search);
      filter.$or = [
        { email: { $regex: encryptedSearch, $options: 'i' } },
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
      ];
    }

    if (role) {
      // Check if role is a valid ObjectId or a role name
      if (Types.ObjectId.isValid(role) && role.length === 24) {
        filter.role = new Types.ObjectId(role);
      } else {
        // Look up role by name
        const roleDoc = await this.roleModel.findOne({ name: role.toUpperCase() });
        if (roleDoc) {
          filter.role = roleDoc._id;
          this.logger.log(`Found role ${role} with ID: ${roleDoc._id}`);
        } else {
          this.logger.warn(`Role not found: ${role}`);
          // Return empty result if role doesn't exist
          return {
            message: this.errorMessageService.getSuccessMessageWithLanguage(
              'USER',
              'USERS_RETRIEVED_SUCCESSFULLY',
              user?.preferred_language || DEFAULT_LANGUAGE,
            ),
            data: [],
            pagination: {
              total: 0,
              page,
              limit,
              totalPages: 0,
            },
          };
        }
      }
    }

    if (status) {
      filter.status = status;
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .populate('role', 'name')
        .populate('school_id', 'name')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.userModel.countDocuments(filter),
    ]);

    // Decrypt emails
    const usersWithDecryptedEmails = users.map((u: any) => ({
      ...u,
      email: this.emailEncryptionService.decryptEmail(u.email),
    }));

    const pagination = createPaginationResult(usersWithDecryptedEmails, total, {
      page,
      limit,
      skip: (page - 1) * limit,
    });

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'USER',
        'USERS_RETRIEVED_SUCCESSFULLY',
        user?.preferred_language || DEFAULT_LANGUAGE,
      ),
      ...pagination,
    };
  }

  async getUserById(id: Types.ObjectId, user?: JWTUserPayload) {
    this.logger.log(`Getting user by ID: ${id}`);

    const foundUser = await this.userModel
      .findById(id)
      .populate('role', 'name')
      .populate('school_id', 'name')
      .lean();

    if (!foundUser) {
      this.logger.warn(`User not found: ${id}`);
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'USER',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'USER',
        'RETRIEVED_SUCCESSFULLY',
        user?.preferred_language || DEFAULT_LANGUAGE,
      ),
      data: foundUser,
    };
  }

  async updateUserStatus(
    id: Types.ObjectId,
    status: StatusEnum,
    user?: JWTUserPayload,
  ) {
    this.logger.log(`Updating user status: ${id} to ${status}`);

    const foundUser = await this.userModel.findById(id);
    if (!foundUser) {
      this.logger.warn(`User not found: ${id}`);
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'USER',
          'NOT_FOUND',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    // Super admin cannot change their own status
    if (foundUser.role.toString() === ROLE_IDS.SUPER_ADMIN) {
      throw new BadRequestException(
        this.errorMessageService.getMessageWithLanguage(
          'USER',
          'SUPER_ADMIN_STATUS_CHANGE_FORBIDDEN',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .populate('role', 'name');

    if (!updatedUser) {
      throw new NotFoundException(
        this.errorMessageService.getMessageWithLanguage(
          'USER',
          'NOT_FOUND_AFTER_UPDATE',
          user?.preferred_language || DEFAULT_LANGUAGE,
        ),
      );
    }

    this.logger.log(`User status updated successfully: ${id} to ${status}`);
    return {
      message: this.errorMessageService.getSuccessMessageWithLanguage(
        'USER',
        'STATUS_UPDATED_SUCCESSFULLY',
        user?.preferred_language || DEFAULT_LANGUAGE,
      ),
      data: {
        id: updatedUser._id,
        email: updatedUser.email,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        status: updatedUser.status,
        role: updatedUser.role,
      },
    };
  }

  /**
   * Create a new account (possibly duplicate email for multi-account support)
   */
  async createMultiAccount(
    email: string,
    password: string,
    first_name: string,
    last_name: string,
    role_id: string,
    school_id: string,
    username?: string,
    account_code?: string,
    preferred_language?: string,
    created_by?: string,
  ) {
    this.logger.log(`Creating account for email: ${email}, role: ${role_id}, school: ${school_id}`);

    // Encrypt email
    const encryptedEmail = this.emailEncryptionService.encryptEmail(email);

    // Check if email + school + role combination already exists
    const existingAccount = await this.userModel.findOne({
      email: encryptedEmail,
      school_id: new Types.ObjectId(school_id),
      role: new Types.ObjectId(role_id),
      deleted_at: null,
    });

    if (existingAccount) {
      throw new BadRequestException({
        message: {
          en: 'An account with this email, school, and role already exists.',
          fr: 'Un compte avec cet email, école et rôle existe déjà.',
        },
        warning: false,
      });
    }

    // Check for other accounts with same email (for warning)
    const accountsWithSameEmail = await this.userModel.countDocuments({
      email: encryptedEmail,
      deleted_at: null,
    });

    const hasExistingAccounts = accountsWithSameEmail > 0;

    // Validate role exists
    const role = await this.roleModel.findById(role_id);
    if (!role) {
      throw new NotFoundException({
        message: {
          en: 'Role not found',
          fr: 'Rôle introuvable',
        },
      });
    }

    // Validate school exists
    const school = await this.schoolModel.findById(school_id);
    if (!school) {
      throw new NotFoundException({
        message: {
          en: 'School not found',
          fr: 'École introuvable',
        },
      });
    }

    // Hash password
    const hashedPassword = await this.bcryptUtil.hashPassword(password);

    // Create new account
    const newAccount = await this.userModel.create({
      email: encryptedEmail,
      password: hashedPassword,
      first_name,
      last_name,
      role: new Types.ObjectId(role_id),
      school_id: new Types.ObjectId(school_id),
      username: username || null,
      account_code: account_code || null,
      preferred_language: preferred_language || DEFAULT_LANGUAGE,
      created_by: created_by ? new Types.ObjectId(created_by) : null,
      status: StatusEnum.ACTIVE,
    });

    this.logger.log(`Account created successfully: ${newAccount._id}`);

    return {
      message: {
        en: hasExistingAccounts
          ? 'Account created successfully. Note: This email already has other accounts.'
          : 'Account created successfully.',
        fr: hasExistingAccounts
          ? 'Compte créé avec succès. Note: Cet email a déjà d\'autres comptes.'
          : 'Compte créé avec succès.',
      },
      warning: hasExistingAccounts,
      data: {
        account_id: newAccount._id.toString(),
        email: email, // Decrypted
        first_name: newAccount.first_name,
        last_name: newAccount.last_name,
        username: newAccount.username,
        account_code: newAccount.account_code,
        role: {
          _id: role._id.toString(),
          name: role.name,
        },
        school: {
          _id: school._id.toString(),
          name: school.name,
        },
        status: newAccount.status,
        created_at: newAccount.created_at,
      },
    };
  }

  /**
   * Get all accounts associated with an email
   */
  async getAccountsByEmail(email: string, user?: JWTUserPayload) {
    this.logger.log(`Getting all accounts for email: ${email}`);

    const encryptedEmail = this.emailEncryptionService.encryptEmail(email);

    const accounts = await this.userModel
      .find({
        email: encryptedEmail,
        deleted_at: null,
      })
      .populate('role', 'name')
      .populate('school_id', 'name')
      .select('_id first_name last_name username account_code status created_at last_logged_in')
      .lean();

    if (accounts.length === 0) {
      throw new NotFoundException({
        message: {
          en: 'No accounts found with this email',
          fr: 'Aucun compte trouvé avec cet email',
        },
      });
    }

    const accountList = accounts.map(account => ({
      account_id: account._id.toString(),
      first_name: account.first_name,
      last_name: account.last_name,
      username: account.username,
      account_code: account.account_code,
      role: account.role,
      school: account.school_id,
      status: account.status,
      created_at: account.created_at,
      last_logged_in: account.last_logged_in,
    }));

    return {
      message: {
        en: `Found ${accounts.length} account(s) for this email`,
        fr: `${accounts.length} compte(s) trouvé(s) pour cet email`,
      },
      accounts_count: accounts.length,
      accounts: accountList,
    };
  }

  /**
   * Update account status (activate/deactivate specific account)
   */
  async updateAccountStatus(
    account_id: string,
    status: StatusEnum,
    user?: JWTUserPayload,
  ) {
    this.logger.log(`Updating account status: ${account_id} to ${status}`);

    const account = await this.userModel.findById(account_id);
    if (!account) {
      throw new NotFoundException({
        message: {
          en: 'Account not found',
          fr: 'Compte introuvable',
        },
      });
    }

    // Prevent super admin status changes
    if (account.role.toString() === ROLE_IDS.SUPER_ADMIN) {
      throw new BadRequestException({
        message: {
          en: 'Cannot change super admin account status',
          fr: 'Impossible de changer le statut du compte super admin',
        },
      });
    }

    account.status = status;
    await account.save();

    this.logger.log(`Account status updated: ${account_id} to ${status}`);

    return {
      message: {
        en: `Account ${status === StatusEnum.ACTIVE ? 'activated' : 'deactivated'} successfully`,
        fr: `Compte ${status === StatusEnum.ACTIVE ? 'activé' : 'désactivé'} avec succès`,
      },
      data: {
        account_id: account._id.toString(),
        status: account.status,
      },
    };
  }

  /**
   * Update account identifiers (username, account_code)
   */
  async updateAccountIdentifiers(
    account_id: string,
    username?: string,
    account_code?: string,
    user?: JWTUserPayload,
  ) {
    this.logger.log(`Updating account identifiers: ${account_id}`);

    const account = await this.userModel.findById(account_id);
    if (!account) {
      throw new NotFoundException({
        message: {
          en: 'Account not found',
          fr: 'Compte introuvable',
        },
      });
    }

    // Update fields if provided
    if (username !== undefined) {
      account.username = username;
    }
    if (account_code !== undefined) {
      account.account_code = account_code;
    }

    await account.save();

    this.logger.log(`Account identifiers updated: ${account_id}`);

    return {
      message: {
        en: 'Account identifiers updated successfully',
        fr: 'Identifiants du compte mis à jour avec succès',
      },
      data: {
        account_id: account._id.toString(),
        username: account.username,
        account_code: account.account_code,
      },
    };
  }

  /**
   * Delete specific account (soft delete)
   */
  async deleteAccount(account_id: string, user?: JWTUserPayload) {
    this.logger.log(`Soft deleting account: ${account_id}`);

    const account = await this.userModel.findById(account_id);
    if (!account) {
      throw new NotFoundException({
        message: {
          en: 'Account not found',
          fr: 'Compte introuvable',
        },
      });
    }

    // Prevent super admin deletion
    if (account.role.toString() === ROLE_IDS.SUPER_ADMIN) {
      throw new BadRequestException({
        message: {
          en: 'Cannot delete super admin account',
          fr: 'Impossible de supprimer le compte super admin',
        },
      });
    }

    account.deleted_at = new Date();
    account.status = StatusEnum.INACTIVE;
    await account.save();

    this.logger.log(`Account soft deleted: ${account_id}`);

    return {
      message: {
        en: 'Account deleted successfully',
        fr: 'Compte supprimé avec succès',
      },
      data: {
        account_id: account._id.toString(),
        deleted_at: account.deleted_at,
      },
    };
  }
}
