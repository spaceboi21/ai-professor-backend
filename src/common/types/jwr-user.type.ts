import { RoleEnum } from '../constants/roles.constant';

export interface JWTUserPayload {
  id: string;
  email: string;
  school_id: string;
  role: {
    id: string;
    name: RoleEnum;
  };
}
