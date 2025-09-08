import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input for Google OAuth user
const testInput: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: 'https://example.com/avatar.png',
  auth_provider: 'google',
  auth_provider_id: 'google_123456',
  preferred_coding_language: 'javascript',
  preferred_ai_model: 'claude-sonnet'
};

// Test input for email auth user without avatar
const emailAuthInput: CreateUserInput = {
  email: 'email@example.com',
  name: 'Email User',
  auth_provider: 'email',
  auth_provider_id: 'email_user_789',
  preferred_coding_language: 'python',
  preferred_ai_model: 'gpt-4'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with OAuth provider', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.avatar_url).toEqual('https://example.com/avatar.png');
    expect(result.auth_provider).toEqual('google');
    expect(result.auth_provider_id).toEqual('google_123456');
    expect(result.preferred_coding_language).toEqual('javascript');
    expect(result.preferred_ai_model).toEqual('claude-sonnet');
    expect(result.id).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a user with email provider and null avatar', async () => {
    const result = await createUser(emailAuthInput);

    expect(result.email).toEqual('email@example.com');
    expect(result.name).toEqual('Email User');
    expect(result.avatar_url).toBeNull();
    expect(result.auth_provider).toEqual('email');
    expect(result.auth_provider_id).toEqual('email_user_789');
    expect(result.preferred_coding_language).toEqual('python');
    expect(result.preferred_ai_model).toEqual('gpt-4');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].name).toEqual('Test User');
    expect(users[0].avatar_url).toEqual('https://example.com/avatar.png');
    expect(users[0].auth_provider).toEqual('google');
    expect(users[0].auth_provider_id).toEqual('google_123456');
    expect(users[0].preferred_coding_language).toEqual('javascript');
    expect(users[0].preferred_ai_model).toEqual('claude-sonnet');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create users with different auth providers', async () => {
    const googleUser: CreateUserInput = {
      email: 'google@example.com',
      name: 'Google User',
      auth_provider: 'google',
      auth_provider_id: 'google_123',
      preferred_coding_language: 'typescript',
      preferred_ai_model: 'claude-sonnet'
    };

    const facebookUser: CreateUserInput = {
      email: 'facebook@example.com',
      name: 'Facebook User',
      auth_provider: 'facebook',
      auth_provider_id: 'facebook_456',
      preferred_coding_language: 'java',
      preferred_ai_model: 'gemini-2.5-flash'
    };

    const googleResult = await createUser(googleUser);
    const facebookResult = await createUser(facebookUser);

    expect(googleResult.auth_provider).toEqual('google');
    expect(facebookResult.auth_provider).toEqual('facebook');
    expect(googleResult.id).not.toEqual(facebookResult.id);
  });

  it('should handle different coding languages and AI models', async () => {
    const rustUser: CreateUserInput = {
      email: 'rust@example.com',
      name: 'Rust Developer',
      auth_provider: 'email',
      auth_provider_id: 'rust_dev_123',
      preferred_coding_language: 'rust',
      preferred_ai_model: 'gpt-4'
    };

    const result = await createUser(rustUser);

    expect(result.preferred_coding_language).toEqual('rust');
    expect(result.preferred_ai_model).toEqual('gpt-4');
  });

  it('should fail when email already exists', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same email
    const duplicateInput: CreateUserInput = {
      ...testInput,
      auth_provider_id: 'different_provider_id'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should allow same auth_provider_id for different providers', async () => {
    const googleUser: CreateUserInput = {
      email: 'google@example.com',
      name: 'Google User',
      auth_provider: 'google',
      auth_provider_id: 'same_id_123',
      preferred_coding_language: 'javascript',
      preferred_ai_model: 'claude-sonnet'
    };

    const facebookUser: CreateUserInput = {
      email: 'facebook@example.com',
      name: 'Facebook User',
      auth_provider: 'facebook',
      auth_provider_id: 'same_id_123', // Same ID but different provider
      preferred_coding_language: 'python',
      preferred_ai_model: 'gpt-4'
    };

    const googleResult = await createUser(googleUser);
    const facebookResult = await createUser(facebookUser);

    expect(googleResult.auth_provider_id).toEqual('same_id_123');
    expect(facebookResult.auth_provider_id).toEqual('same_id_123');
    expect(googleResult.auth_provider).toEqual('google');
    expect(facebookResult.auth_provider).toEqual('facebook');
  });
});