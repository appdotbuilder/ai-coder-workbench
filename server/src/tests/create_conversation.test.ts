import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { conversationsTable, usersTable, projectsTable } from '../db/schema';
import { type CreateConversationInput } from '../schema';
import { createConversation } from '../handlers/create_conversation';
import { eq } from 'drizzle-orm';

describe('createConversation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let testProject: any;

  beforeEach(async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: null,
        auth_provider: 'email',
        auth_provider_id: 'test123',
        preferred_coding_language: 'typescript',
        preferred_ai_model: 'claude-sonnet'
      })
      .returning()
      .execute();
    testUser = userResult[0];

    // Create a test project
    const projectResult = await db.insert(projectsTable)
      .values({
        user_id: testUser.id,
        name: 'Test Project',
        description: 'A project for testing',
        coding_language: 'typescript'
      })
      .returning()
      .execute();
    testProject = projectResult[0];
  });

  it('should create a conversation successfully', async () => {
    const input: CreateConversationInput = {
      project_id: testProject.id,
      user_id: testUser.id,
      title: 'Test Conversation',
      ai_model: 'claude-sonnet'
    };

    const result = await createConversation(input);

    // Validate the returned conversation
    expect(result.id).toBeDefined();
    expect(result.project_id).toEqual(testProject.id);
    expect(result.user_id).toEqual(testUser.id);
    expect(result.title).toEqual('Test Conversation');
    expect(result.ai_model).toEqual('claude-sonnet');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save conversation to database', async () => {
    const input: CreateConversationInput = {
      project_id: testProject.id,
      user_id: testUser.id,
      title: 'Database Test Conversation',
      ai_model: 'gemini-2.5-flash'
    };

    const result = await createConversation(input);

    // Query the database to verify the conversation was saved
    const conversations = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, result.id))
      .execute();

    expect(conversations).toHaveLength(1);
    expect(conversations[0].project_id).toEqual(testProject.id);
    expect(conversations[0].user_id).toEqual(testUser.id);
    expect(conversations[0].title).toEqual('Database Test Conversation');
    expect(conversations[0].ai_model).toEqual('gemini-2.5-flash');
    expect(conversations[0].created_at).toBeInstanceOf(Date);
    expect(conversations[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    const input: CreateConversationInput = {
      project_id: testProject.id,
      user_id: 99999, // Non-existent user ID
      title: 'Test Conversation',
      ai_model: 'claude-sonnet'
    };

    await expect(createConversation(input))
      .rejects
      .toThrow(/User with id 99999 not found/i);
  });

  it('should throw error when project does not exist', async () => {
    const input: CreateConversationInput = {
      project_id: 99999, // Non-existent project ID
      user_id: testUser.id,
      title: 'Test Conversation',
      ai_model: 'claude-sonnet'
    };

    await expect(createConversation(input))
      .rejects
      .toThrow(/Project with id 99999 not found/i);
  });

  it('should throw error when project does not belong to user', async () => {
    // Create another user
    const anotherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        name: 'Other User',
        avatar_url: null,
        auth_provider: 'google',
        auth_provider_id: 'other123',
        preferred_coding_language: 'python',
        preferred_ai_model: 'gpt-4'
      })
      .returning()
      .execute();
    const anotherUser = anotherUserResult[0];

    // Try to create conversation with wrong user for the project
    const input: CreateConversationInput = {
      project_id: testProject.id,
      user_id: anotherUser.id, // Different user than project owner
      title: 'Unauthorized Conversation',
      ai_model: 'claude-sonnet'
    };

    await expect(createConversation(input))
      .rejects
      .toThrow(/Project with id .+ not found or does not belong to user/i);
  });

  it('should handle different AI models correctly', async () => {
    const models = ['claude-sonnet', 'gemini-2.5-flash', 'gpt-4'] as const;

    for (const model of models) {
      const input: CreateConversationInput = {
        project_id: testProject.id,
        user_id: testUser.id,
        title: `Conversation with ${model}`,
        ai_model: model
      };

      const result = await createConversation(input);
      expect(result.ai_model).toEqual(model);
      expect(result.title).toEqual(`Conversation with ${model}`);
    }
  });

  it('should create multiple conversations for the same project', async () => {
    const inputs: CreateConversationInput[] = [
      {
        project_id: testProject.id,
        user_id: testUser.id,
        title: 'First Conversation',
        ai_model: 'claude-sonnet'
      },
      {
        project_id: testProject.id,
        user_id: testUser.id,
        title: 'Second Conversation',
        ai_model: 'gemini-2.5-flash'
      }
    ];

    const results = [];
    for (const input of inputs) {
      const result = await createConversation(input);
      results.push(result);
    }

    expect(results).toHaveLength(2);
    expect(results[0].id).not.toEqual(results[1].id);
    expect(results[0].title).toEqual('First Conversation');
    expect(results[1].title).toEqual('Second Conversation');

    // Verify both are in the database
    const conversations = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.project_id, testProject.id))
      .execute();

    expect(conversations).toHaveLength(2);
  });
});