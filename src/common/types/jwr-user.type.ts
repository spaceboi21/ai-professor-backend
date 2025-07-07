import { Types } from 'mongoose';
import { RoleEnum } from '../constants/roles.constant';

export interface JWTUserPayload {
  id: string | Types.ObjectId;
  email: string;
  school_id: string | null | Types.ObjectId;
  role: {
    id: string | Types.ObjectId;
    name: RoleEnum;
  };
}
