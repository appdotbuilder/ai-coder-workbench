import { db } from '../db';
import { usersTable } from '../db/schema';
import { type AuthInput, type User } from '../schema';
import { eq, and } from 'drizzle-orm';

/**
 * Handler for authenticating users by their OAuth provider or email.
 * Used during sign-in to find existing users or determine if registration is needed.
 * Searches by auth_provider and auth_provider_id combination.
 */
export async function getUserByAuth(input: AuthInput): Promise<User | null> {
  try {
    const results = await db.select()
      .from(usersTable)
      .where(and(
        eq(usersTable.auth_provider, input.auth_provider),
        eq(usersTable.auth_provider_id, input.auth_provider_id)
      ))
      .limit(1)
      .execute();

    if (results.length === 0) {
      return null;
    }

    return results[0];
  } catch (error) {
    console.error('User authentication lookup failed:', error);
    throw error;
  }
}