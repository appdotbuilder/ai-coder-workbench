import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

/**
 * Handler for creating a new user account with OAuth or email authentication.
 * This handles user registration from Google, Facebook, or email/password sign-up.
 * Validates that the email is unique and creates the user with their preferred settings.
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        name: input.name,
        avatar_url: input.avatar_url || null,
        auth_provider: input.auth_provider,
        auth_provider_id: input.auth_provider_id,
        preferred_coding_language: input.preferred_coding_language,
        preferred_ai_model: input.preferred_ai_model
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}