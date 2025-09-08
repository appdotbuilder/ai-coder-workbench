import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type User } from '../schema';

/**
 * Handler for retrieving a user by their unique ID.
 * Used for fetching user profile information and validating user existence.
 */
export const getUserById = async (userId: number): Promise<User | null> => {
  try {
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
      .execute();

    if (results.length === 0) {
      return null;
    }

    const user = results[0];
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      auth_provider: user.auth_provider,
      auth_provider_id: user.auth_provider_id,
      preferred_coding_language: user.preferred_coding_language,
      preferred_ai_model: user.preferred_ai_model,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('Failed to get user by ID:', error);
    throw error;
  }
};