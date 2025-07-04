import { SetMetadata } from '@nestjs/common';
import { RoleEnum } from '../constants/roles.constant';

export const ROLE_KEY = 'Roles';

export const Roles = (...Roles: RoleEnum[]) => SetMetadata(ROLE_KEY, Roles);
