import { Types } from 'mongoose';
import {
  Student,
  StudentSchema,
} from 'src/database/schemas/tenant/student.schema';

export interface MentionInfo {
  username: string;
  mentionText: string;
  userId?: Types.ObjectId;
  userRole?: string;
}

/**
 * Extract mentions from content using regex
 */
export function extractMentions(content: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    const email = match[1];
    if (email && !mentions.includes(email)) {
      mentions.push(email);
    }
  }

  return mentions;
}

/**
 * Format content with mention links
 */
export function formatMentionsInContent(
  content: string,
  resolvedMentions: MentionInfo[],
): string {
  let formattedContent = content;

  for (const mention of resolvedMentions) {
    if (mention.userId) {
      const mentionRegex = new RegExp(`@${mention.username}`, 'g');
      const userLink = `<a href="/profile/${mention.userId}" class="mention-link">@${mention.username}</a>`;
      formattedContent = formattedContent.replace(mentionRegex, userLink);
    }
  }

  return formattedContent;
}

/**
 * Validate and resolve mentions to user IDs with optimized queries
 */
export async function resolveMentions(
  mentions: string[],
  tenantConnection: any,
  userModel: any,
): Promise<MentionInfo[]> {
  if (!mentions || mentions.length === 0) {
    return [];
  }

  const resolvedMentions: MentionInfo[] = [];
  const StudentModel = tenantConnection.model(Student.name, StudentSchema);

  try {
    // Batch query for students by email
    const studentEmails = mentions.filter((email) => email.includes('@'));
    const students = await StudentModel.find({
      email: { $in: studentEmails },
      deleted_at: null,
    }).lean();

    // Batch query for users by email
    const users = await userModel
      .find({
        email: { $in: studentEmails },
        deleted_at: null,
      })
      .lean();

    // Create lookup maps for faster access
    const studentMap = new Map(students.map((s: any) => [s.email, s]));
    const userMap = new Map(users.map((u: any) => [u.email, u]));

    // Process each mention
    for (const mention of mentions) {
      const mentionText = `@${mention}`;

      // First try to find by exact email match in students
      const student = studentMap.get(mention);
      if (student) {
        resolvedMentions.push({
          username: mention,
          mentionText,
          userId: (student as any)._id,
          userRole: 'STUDENT',
        });
        continue;
      }

      // Then try to find by exact email in users
      const user = userMap.get(mention);
      if (user) {
        resolvedMentions.push({
          username: mention,
          mentionText,
          userId: (user as any)._id,
          userRole: (user as any).role,
        });
        continue;
      }

      // If no exact email match, try partial name matching for students
      const studentByName = await StudentModel.findOne({
        $or: [
          { first_name: { $regex: mention, $options: 'i' } },
          { last_name: { $regex: mention, $options: 'i' } },
          {
            $expr: {
              $regexMatch: {
                input: { $concat: ['$first_name', ' ', '$last_name'] },
                regex: mention,
                options: 'i',
              },
            },
          },
        ],
        deleted_at: null,
      }).lean();

      if (studentByName) {
        resolvedMentions.push({
          username: mention,
          mentionText,
          userId: studentByName._id,
          userRole: 'STUDENT',
        });
        continue;
      }

      // Try partial name matching in users
      const userByName = await userModel
        .findOne({
          $or: [
            { first_name: { $regex: mention, $options: 'i' } },
            { last_name: { $regex: mention, $options: 'i' } },
            {
              $expr: {
                $regexMatch: {
                  input: { $concat: ['$first_name', ' ', '$last_name'] },
                  regex: mention,
                  options: 'i',
                },
              },
            },
          ],
          deleted_at: null,
        })
        .lean();

      if (userByName) {
        resolvedMentions.push({
          username: mention,
          mentionText,
          userId: userByName._id,
          userRole: userByName.role,
        });
      }
    }

    return resolvedMentions;
  } catch (error) {
    console.error('Error resolving mentions:', error);
    return [];
  }
}
