import { Model, Types } from 'mongoose';
import { User } from 'src/database/schemas/central/user.schema';

export interface UserDetails {
  _id: Types.ObjectId;
  first_name: string;
  last_name: string;
  email: string;
}

export interface EntityWithUser {
  created_by: Types.ObjectId;
  created_by_user?: UserDetails | null;
  [key: string]: any;
}

/**
 * Fetches user details for entities with created_by fields and attaches them
 * @param entities Array of entities with created_by field
 * @param userModel Mongoose User model
 * @returns Entities with attached user details
 */
export async function attachUserDetails<T extends EntityWithUser>(
  entities: T[],
  userModel: Model<User>,
): Promise<(T & { created_by_user: UserDetails | null })[]> {
  if (!entities || entities.length === 0) {
    return entities as (T & { created_by_user: UserDetails | null })[];
  }

  // Extract unique user IDs
  const userIds = [...new Set(entities.map((entity) => entity.created_by))];

  // Fetch user details
  const users = await userModel
    .find({ _id: { $in: userIds } })
    .select('first_name last_name email')
    .lean();

  // Create a map for quick lookup
  const userMap = users.reduce(
    (map, user) => {
      map[user._id.toString()] = user;
      return map;
    },
    {} as Record<string, UserDetails>,
  );

  // Attach user details to entities
  return entities.map((entity) => ({
    ...entity,
    created_by_user: userMap[entity.created_by.toString()] || null,
  }));
}

/**
 * Fetches user details for a single entity with created_by field
 * @param entity Entity with created_by field
 * @param userModel Mongoose User model
 * @returns Entity with attached user details
 */
export async function attachUserDetailsToEntity<T extends EntityWithUser>(
  entity: T,
  userModel: Model<User>,
): Promise<T & { created_by_user: UserDetails | null }> {
  if (!entity) {
    return entity as T & { created_by_user: UserDetails | null };
  }

  const user = await userModel
    .findById(entity.created_by)
    .select('first_name last_name email')
    .lean();

  return {
    ...entity,
    created_by_user: user || null,
  };
}
