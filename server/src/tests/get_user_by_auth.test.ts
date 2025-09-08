import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type AuthInput, type CreateUserInput } from '../schema';
import { getUserByAuth } from '../handlers/get_user_by_auth';

// Test user data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  auth_provider: 'google',
  auth_provider_id: 'google_123456',
  preferred_coding_language: 'typescript',
  preferred_ai_model: 'claude-sonnet'
};

const testUser2: CreateUserInput = {
  email: 'facebook@example.com',
  name: 'Facebook User',
  avatar_url: null,
  auth_provider: 'facebook',
  auth_provider_id: 'fb_789012',
  preferred_coding_language: 'javascript',
  preferred_ai_model: 'gpt-4'
};

const testUser3: CreateUserInput = {
  email: 'email@example.com',
  name: 'Email User',
  auth_provider: 'email',
  auth_provider_id: 'email_345678',
  preferred_coding_language: 'python',
  preferred_ai_model: 'gemini-2.5-flash'
};

describe('getUserByAuth', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should find user by Google auth provider', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        name: testUser.name,
        avatar_url: testUser.avatar_url,
        auth_provider: testUser.auth_provider,
        auth_provider_id: testUser.auth_provider_id,
        preferred_coding_language: testUser.preferred_coding_language,
        preferred_ai_model: testUser.preferred_ai_model
      })
      .execute();

    const authInput: AuthInput = {
      auth_provider: 'google',
      auth_provider_id: 'google_123456',
      name: 'Test User' // Required by schema but not used in lookup
    };

    const result = await getUserByAuth(authInput);

    expect(result).not.toBeNull();
    expect(result!.email).toEqual('test@example.com');
    expect(result!.name).toEqual('Test User');
    expect(result!.auth_provider).toEqual('google');
    expect(result!.auth_provider_id).toEqual('google_123456');
    expect(result!.preferred_coding_language).toEqual('typescript');
    expect(result!.preferred_ai_model).toEqual('claude-sonnet');
    expect(result!.avatar_url).toEqual('https://example.com/avatar.jpg');
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should find user by Facebook auth provider', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        email: testUser2.email,
        name: testUser2.name,
        avatar_url: testUser2.avatar_url,
        auth_provider: testUser2.auth_provider,
        auth_provider_id: testUser2.auth_provider_id,
        preferred_coding_language: testUser2.preferred_coding_language,
        preferred_ai_model: testUser2.preferred_ai_model
      })
      .execute();

    const authInput: AuthInput = {
      auth_provider: 'facebook',
      auth_provider_id: 'fb_789012',
      name: 'Facebook User'
    };

    const result = await getUserByAuth(authInput);

    expect(result).not.toBeNull();
    expect(result!.email).toEqual('facebook@example.com');
    expect(result!.name).toEqual('Facebook User');
    expect(result!.auth_provider).toEqual('facebook');
    expect(result!.auth_provider_id).toEqual('fb_789012');
    expect(result!.avatar_url).toBeNull();
  });

  it('should find user by email auth provider', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        email: testUser3.email,
        name: testUser3.name,
        avatar_url: testUser3.avatar_url,
        auth_provider: testUser3.auth_provider,
        auth_provider_id: testUser3.auth_provider_id,
        preferred_coding_language: testUser3.preferred_coding_language,
        preferred_ai_model: testUser3.preferred_ai_model
      })
      .execute();

    const authInput: AuthInput = {
      auth_provider: 'email',
      auth_provider_id: 'email_345678',
      name: 'Email User'
    };

    const result = await getUserByAuth(authInput);

    expect(result).not.toBeNull();
    expect(result!.email).toEqual('email@example.com');
    expect(result!.auth_provider).toEqual('email');
    expect(result!.auth_provider_id).toEqual('email_345678');
    expect(result!.preferred_coding_language).toEqual('python');
    expect(result!.preferred_ai_model).toEqual('gemini-2.5-flash');
  });

  it('should return null when user does not exist', async () => {
    const authInput: AuthInput = {
      auth_provider: 'google',
      auth_provider_id: 'nonexistent_id',
      name: 'Nonexistent User'
    };

    const result = await getUserByAuth(authInput);

    expect(result).toBeNull();
  });

  it('should return null when auth_provider matches but auth_provider_id does not', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        name: testUser.name,
        avatar_url: testUser.avatar_url,
        auth_provider: testUser.auth_provider,
        auth_provider_id: testUser.auth_provider_id,
        preferred_coding_language: testUser.preferred_coding_language,
        preferred_ai_model: testUser.preferred_ai_model
      })
      .execute();

    const authInput: AuthInput = {
      auth_provider: 'google', // Same provider
      auth_provider_id: 'wrong_id', // Different ID
      name: 'Test User'
    };

    const result = await getUserByAuth(authInput);

    expect(result).toBeNull();
  });

  it('should return null when auth_provider_id matches but auth_provider does not', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        name: testUser.name,
        avatar_url: testUser.avatar_url,
        auth_provider: testUser.auth_provider,
        auth_provider_id: testUser.auth_provider_id,
        preferred_coding_language: testUser.preferred_coding_language,
        preferred_ai_model: testUser.preferred_ai_model
      })
      .execute();

    const authInput: AuthInput = {
      auth_provider: 'facebook', // Different provider
      auth_provider_id: 'google_123456', // Same ID
      name: 'Test User'
    };

    const result = await getUserByAuth(authInput);

    expect(result).toBeNull();
  });

  it('should handle multiple users with same provider but different IDs correctly', async () => {
    // Create multiple Google users
    await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          name: 'User 1',
          avatar_url: null,
          auth_provider: 'google',
          auth_provider_id: 'google_111',
          preferred_coding_language: 'javascript',
          preferred_ai_model: 'claude-sonnet'
        },
        {
          email: 'user2@example.com',
          name: 'User 2',
          avatar_url: null,
          auth_provider: 'google',
          auth_provider_id: 'google_222',
          preferred_coding_language: 'typescript',
          preferred_ai_model: 'gpt-4'
        }
      ])
      .execute();

    // Look for first user
    const authInput1: AuthInput = {
      auth_provider: 'google',
      auth_provider_id: 'google_111',
      name: 'User 1'
    };

    const result1 = await getUserByAuth(authInput1);
    expect(result1).not.toBeNull();
    expect(result1!.email).toEqual('user1@example.com');
    expect(result1!.name).toEqual('User 1');

    // Look for second user
    const authInput2: AuthInput = {
      auth_provider: 'google',
      auth_provider_id: 'google_222',
      name: 'User 2'
    };

    const result2 = await getUserByAuth(authInput2);
    expect(result2).not.toBeNull();
    expect(result2!.email).toEqual('user2@example.com');
    expect(result2!.name).toEqual('User 2');
  });

  it('should handle users with same ID across different providers', async () => {
    // Create users with same ID but different providers
    await db.insert(usersTable)
      .values([
        {
          email: 'google@example.com',
          name: 'Google User',
          avatar_url: null,
          auth_provider: 'google',
          auth_provider_id: 'same_id_123',
          preferred_coding_language: 'javascript',
          preferred_ai_model: 'claude-sonnet'
        },
        {
          email: 'facebook@example.com',
          name: 'Facebook User',
          avatar_url: null,
          auth_provider: 'facebook',
          auth_provider_id: 'same_id_123',
          preferred_coding_language: 'typescript',
          preferred_ai_model: 'gpt-4'
        }
      ])
      .execute();

    // Look for Google user
    const googleAuth: AuthInput = {
      auth_provider: 'google',
      auth_provider_id: 'same_id_123',
      name: 'Google User'
    };

    const googleResult = await getUserByAuth(googleAuth);
    expect(googleResult).not.toBeNull();
    expect(googleResult!.email).toEqual('google@example.com');
    expect(googleResult!.auth_provider).toEqual('google');

    // Look for Facebook user
    const facebookAuth: AuthInput = {
      auth_provider: 'facebook',
      auth_provider_id: 'same_id_123',
      name: 'Facebook User'
    };

    const facebookResult = await getUserByAuth(facebookAuth);
    expect(facebookResult).not.toBeNull();
    expect(facebookResult!.email).toEqual('facebook@example.com');
    expect(facebookResult!.auth_provider).toEqual('facebook');
  });
});