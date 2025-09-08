import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Handler for updating user profile information.
 * Allows users to modify their name, avatar, preferred coding language, and AI model.
 * Updates the updated_at timestamp automatically.
 */
export async function updateUser(input: UpdateUserInput): Promise<User> {
  try {
    // First, verify the user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof usersTable.$inferInsert> = {
      updated_at: new Date() // Always update the timestamp
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.avatar_url !== undefined) {
      updateData.avatar_url = input.avatar_url;
    }

    if (input.preferred_coding_language !== undefined) {
      updateData.preferred_coding_language = input.preferred_coding_language;
    }

    if (input.preferred_ai_model !== undefined) {
      updateData.preferred_ai_model = input.preferred_ai_model;
    }

    // Update the user record
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
}