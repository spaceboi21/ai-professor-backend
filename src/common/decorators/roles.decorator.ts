import { SetMetadata } from '@nestjs/common';
import { Role } from 'src/database/schemas/central/role.schema';

export const ROLE_KEY = 'Roles';

export const Roles = (...Roles: Role[]) => SetMetadata(ROLE_KEY, Roles);
