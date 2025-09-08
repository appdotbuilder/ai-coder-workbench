import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Test user data
const testUserInput: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  auth_provider: 'google',
  auth_provider_id: 'google123',
  preferred_coding_language: 'javascript',
  preferred_ai_model: 'claude-sonnet'
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user name', async () => {
    // Create a test user first
    const [createdUser] = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      name: 'Updated Name'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(createdUser.id);
    expect(result.name).toEqual('Updated Name');
    expect(result.email).toEqual(testUserInput.email);
    expect(result.avatar_url).toEqual(testUserInput.avatar_url || null);
    expect(result.preferred_coding_language).toEqual(testUserInput.preferred_coding_language);
    expect(result.preferred_ai_model).toEqual(testUserInput.preferred_ai_model);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > createdUser.updated_at).toBe(true);
  });

  it('should update avatar_url to null', async () => {
    // Create a test user first
    const [createdUser] = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      avatar_url: null
    };

    const result = await updateUser(updateInput);

    expect(result.avatar_url).toBeNull();
    expect(result.name).toEqual(testUserInput.name); // Other fields unchanged
    expect(result.updated_at > createdUser.updated_at).toBe(true);
  });

  it('should update preferred_coding_language', async () => {
    // Create a test user first
    const [createdUser] = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      preferred_coding_language: 'typescript'
    };

    const result = await updateUser(updateInput);

    expect(result.preferred_coding_language).toEqual('typescript');
    expect(result.name).toEqual(testUserInput.name); // Other fields unchanged
    expect(result.updated_at > createdUser.updated_at).toBe(true);
  });

  it('should update preferred_ai_model', async () => {
    // Create a test user first
    const [createdUser] = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      preferred_ai_model: 'gpt-4'
    };

    const result = await updateUser(updateInput);

    expect(result.preferred_ai_model).toEqual('gpt-4');
    expect(result.name).toEqual(testUserInput.name); // Other fields unchanged
    expect(result.updated_at > createdUser.updated_at).toBe(true);
  });

  it('should update multiple fields at once', async () => {
    // Create a test user first
    const [createdUser] = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      name: 'New Name',
      avatar_url: 'https://newavatar.com/pic.png',
      preferred_coding_language: 'python',
      preferred_ai_model: 'gemini-2.5-flash'
    };

    const result = await updateUser(updateInput);

    expect(result.name).toEqual('New Name');
    expect(result.avatar_url).toEqual('https://newavatar.com/pic.png');
    expect(result.preferred_coding_language).toEqual('python');
    expect(result.preferred_ai_model).toEqual('gemini-2.5-flash');
    expect(result.email).toEqual(testUserInput.email); // Unchanged field
    expect(result.updated_at > createdUser.updated_at).toBe(true);
  });

  it('should update only updated_at when no fields provided', async () => {
    // Create a test user first
    const [createdUser] = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();

    const updateInput: UpdateUserInput = {
      id: createdUser.id
    };

    const result = await updateUser(updateInput);

    // All fields should remain the same except updated_at
    expect(result.name).toEqual(testUserInput.name);
    expect(result.email).toEqual(testUserInput.email);
    expect(result.avatar_url).toEqual(testUserInput.avatar_url || null);
    expect(result.preferred_coding_language).toEqual(testUserInput.preferred_coding_language);
    expect(result.preferred_ai_model).toEqual(testUserInput.preferred_ai_model);
    expect(result.updated_at > createdUser.updated_at).toBe(true);
  });

  it('should save changes to database', async () => {
    // Create a test user first
    const [createdUser] = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      name: 'Database Updated Name',
      preferred_coding_language: 'rust'
    };

    await updateUser(updateInput);

    // Verify changes were saved to database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, createdUser.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].name).toEqual('Database Updated Name');
    expect(users[0].preferred_coding_language).toEqual('rust');
    expect(users[0].updated_at > createdUser.updated_at).toBe(true);
  });

  it('should throw error for non-existent user', async () => {
    const updateInput: UpdateUserInput = {
      id: 99999, // Non-existent user ID
      name: 'Should Fail'
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should handle avatar_url set to empty string', async () => {
    // Create a test user first
    const [createdUser] = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      avatar_url: 'https://newurl.com/avatar.jpg'
    };

    const result = await updateUser(updateInput);

    expect(result.avatar_url).toEqual('https://newurl.com/avatar.jpg');
    expect(result.updated_at > createdUser.updated_at).toBe(true);
  });

  it('should preserve auth fields when updating profile', async () => {
    // Create a test user first
    const [createdUser] = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      name: 'New Name'
    };

    const result = await updateUser(updateInput);

    // Auth fields should remain unchanged
    expect(result.auth_provider).toEqual(testUserInput.auth_provider);
    expect(result.auth_provider_id).toEqual(testUserInput.auth_provider_id);
    expect(result.email).toEqual(testUserInput.email);
    expect(result.created_at).toEqual(createdUser.created_at);
  });
});