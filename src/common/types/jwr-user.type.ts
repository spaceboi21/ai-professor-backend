import { Types } from 'mongoose';
import { RoleEnum } from '../constants/roles.constant';
import { LanguageEnum } from '../constants/language.constant';

export interface JWTUserPayload {
  id: string | Types.ObjectId;
  email: string;
  school_id: string | null | Types.ObjectId;
  role: {
    id: string | Types.ObjectId;
    name: RoleEnum;
  };
  preferred_language: LanguageEnum;
  
  // Simulation-related fields (only present when in simulation mode)
  is_simulation?: boolean;
  simulation_session_id?: string;
  original_user_id?: string;
  original_user_role?: RoleEnum;
}
