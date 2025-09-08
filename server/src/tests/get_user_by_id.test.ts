import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUserById } from '../handlers/get_user_by_id';
import { eq } from 'drizzle-orm';
import { type CreateUserInput } from '../schema';

// Test user data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  auth_provider: 'google',
  auth_provider_id: 'google123',
  preferred_coding_language: 'typescript',
  preferred_ai_model: 'claude-sonnet'
};

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when found', async () => {
    // Create a test user first
    const insertResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        name: testUser.name,
        avatar_url: testUser.avatar_url,
        auth_provider: testUser.auth_provider,
        auth_provider_id: testUser.auth_provider_id,
        preferred_coding_language: testUser.preferred_coding_language,
        preferred_ai_model: testUser.preferred_ai_model
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Test the handler
    const result = await getUserById(createdUser.id);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toBe(createdUser.id);
    expect(result!.email).toBe('test@example.com');
    expect(result!.name).toBe('Test User');
    expect(result!.avatar_url).toBe('https://example.com/avatar.jpg');
    expect(result!.auth_provider).toBe('google');
    expect(result!.auth_provider_id).toBe('google123');
    expect(result!.preferred_coding_language).toBe('typescript');
    expect(result!.preferred_ai_model).toBe('claude-sonnet');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user does not exist', async () => {
    const result = await getUserById(999);

    expect(result).toBeNull();
  });

  it('should return user with null avatar_url', async () => {
    // Create user without avatar
    const userWithoutAvatar = {
      ...testUser,
      avatar_url: null
    };

    const insertResult = await db.insert(usersTable)
      .values({
        email: userWithoutAvatar.email,
        name: userWithoutAvatar.name,
        avatar_url: userWithoutAvatar.avatar_url,
        auth_provider: userWithoutAvatar.auth_provider,
        auth_provider_id: userWithoutAvatar.auth_provider_id,
        preferred_coding_language: userWithoutAvatar.preferred_coding_language,
        preferred_ai_model: userWithoutAvatar.preferred_ai_model
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];
    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.avatar_url).toBeNull();
    expect(result!.email).toBe(userWithoutAvatar.email);
  });

  it('should handle different auth providers correctly', async () => {
    // Test with email auth provider
    const emailUser = {
      ...testUser,
      email: 'email@test.com',
      auth_provider: 'email' as const,
      auth_provider_id: 'email456'
    };

    const insertResult = await db.insert(usersTable)
      .values({
        email: emailUser.email,
        name: emailUser.name,
        avatar_url: emailUser.avatar_url,
        auth_provider: emailUser.auth_provider,
        auth_provider_id: emailUser.auth_provider_id,
        preferred_coding_language: emailUser.preferred_coding_language,
        preferred_ai_model: emailUser.preferred_ai_model
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];
    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.auth_provider).toBe('email');
    expect(result!.auth_provider_id).toBe('email456');
  });

  it('should return correct user among multiple users', async () => {
    // Create multiple users
    const user1 = await db.insert(usersTable)
      .values({
        email: 'user1@test.com',
        name: 'User 1',
        avatar_url: null,
        auth_provider: 'google',
        auth_provider_id: 'google1',
        preferred_coding_language: 'javascript',
        preferred_ai_model: 'gpt-4'
      })
      .returning()
      .execute();

    const user2 = await db.insert(usersTable)
      .values({
        email: 'user2@test.com',
        name: 'User 2',
        avatar_url: 'https://example.com/avatar2.jpg',
        auth_provider: 'facebook',
        auth_provider_id: 'facebook2',
        preferred_coding_language: 'python',
        preferred_ai_model: 'claude-sonnet'
      })
      .returning()
      .execute();

    // Get the second user specifically
    const result = await getUserById(user2[0].id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(user2[0].id);
    expect(result!.email).toBe('user2@test.com');
    expect(result!.name).toBe('User 2');
    expect(result!.auth_provider).toBe('facebook');
    expect(result!.preferred_coding_language).toBe('python');
  });

  it('should verify user exists in database after retrieval', async () => {
    // Create a test user
    const insertResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        name: testUser.name,
        avatar_url: testUser.avatar_url,
        auth_provider: testUser.auth_provider,
        auth_provider_id: testUser.auth_provider_id,
        preferred_coding_language: testUser.preferred_coding_language,
        preferred_ai_model: testUser.preferred_ai_model
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Get user via handler
    const result = await getUserById(createdUser.id);

    // Verify user still exists in database with direct query
    const dbUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, createdUser.id))
      .execute();

    expect(result).not.toBeNull();
    expect(dbUsers).toHaveLength(1);
    expect(dbUsers[0].id).toBe(result!.id);
    expect(dbUsers[0].email).toBe(result!.email);
  });
});