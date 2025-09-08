import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable, conversationsTable } from '../db/schema';
import { type UpdateConversationInput } from '../schema';
import { updateConversation } from '../handlers/update_conversation';
import { eq } from 'drizzle-orm';

describe('updateConversation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testProjectId: number;
  let testConversationId: number;

  beforeEach(async () => {
    // Create prerequisite test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        auth_provider: 'email',
        auth_provider_id: 'test123',
        preferred_coding_language: 'typescript',
        preferred_ai_model: 'claude-sonnet'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create prerequisite test project
    const projectResult = await db.insert(projectsTable)
      .values({
        user_id: testUserId,
        name: 'Test Project',
        description: 'A project for testing',
        coding_language: 'typescript'
      })
      .returning()
      .execute();
    testProjectId = projectResult[0].id;

    // Create test conversation
    const conversationResult = await db.insert(conversationsTable)
      .values({
        project_id: testProjectId,
        user_id: testUserId,
        title: 'Original Conversation',
        ai_model: 'claude-sonnet'
      })
      .returning()
      .execute();
    testConversationId = conversationResult[0].id;
  });

  it('should update conversation title', async () => {
    const updateInput: UpdateConversationInput = {
      id: testConversationId,
      title: 'Updated Conversation Title'
    };

    const result = await updateConversation(updateInput);

    // Verify the result
    expect(result.id).toBe(testConversationId);
    expect(result.title).toBe('Updated Conversation Title');
    expect(result.ai_model).toBe('claude-sonnet'); // Should remain unchanged
    expect(result.project_id).toBe(testProjectId);
    expect(result.user_id).toBe(testUserId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update conversation AI model', async () => {
    const updateInput: UpdateConversationInput = {
      id: testConversationId,
      ai_model: 'gpt-4'
    };

    const result = await updateConversation(updateInput);

    // Verify the result
    expect(result.id).toBe(testConversationId);
    expect(result.title).toBe('Original Conversation'); // Should remain unchanged
    expect(result.ai_model).toBe('gpt-4');
    expect(result.project_id).toBe(testProjectId);
    expect(result.user_id).toBe(testUserId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update both title and AI model', async () => {
    const updateInput: UpdateConversationInput = {
      id: testConversationId,
      title: 'New Title',
      ai_model: 'gemini-2.5-flash'
    };

    const result = await updateConversation(updateInput);

    // Verify the result
    expect(result.id).toBe(testConversationId);
    expect(result.title).toBe('New Title');
    expect(result.ai_model).toBe('gemini-2.5-flash');
    expect(result.project_id).toBe(testProjectId);
    expect(result.user_id).toBe(testUserId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update the updated_at timestamp', async () => {
    // Get original conversation to compare timestamps
    const originalConversation = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, testConversationId))
      .execute();

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateConversationInput = {
      id: testConversationId,
      title: 'Updated Title'
    };

    const result = await updateConversation(updateInput);

    // Verify updated_at was changed
    expect(result.updated_at.getTime()).toBeGreaterThan(originalConversation[0].updated_at.getTime());
  });

  it('should save updated conversation to database', async () => {
    const updateInput: UpdateConversationInput = {
      id: testConversationId,
      title: 'Database Test Title',
      ai_model: 'gpt-4'
    };

    await updateConversation(updateInput);

    // Verify the conversation was updated in the database
    const conversations = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, testConversationId))
      .execute();

    expect(conversations).toHaveLength(1);
    expect(conversations[0].title).toBe('Database Test Title');
    expect(conversations[0].ai_model).toBe('gpt-4');
    expect(conversations[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when conversation not found', async () => {
    const updateInput: UpdateConversationInput = {
      id: 99999, // Non-existent ID
      title: 'Should Fail'
    };

    await expect(updateConversation(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle partial updates correctly', async () => {
    // Update only title
    const titleUpdate: UpdateConversationInput = {
      id: testConversationId,
      title: 'Only Title Changed'
    };

    const titleResult = await updateConversation(titleUpdate);
    expect(titleResult.title).toBe('Only Title Changed');
    expect(titleResult.ai_model).toBe('claude-sonnet'); // Original value

    // Update only AI model
    const modelUpdate: UpdateConversationInput = {
      id: testConversationId,
      ai_model: 'gemini-2.5-flash'
    };

    const modelResult = await updateConversation(modelUpdate);
    expect(modelResult.title).toBe('Only Title Changed'); // From previous update
    expect(modelResult.ai_model).toBe('gemini-2.5-flash');
  });

  it('should handle all valid AI model values', async () => {
    const aiModels: Array<'claude-sonnet' | 'gemini-2.5-flash' | 'gpt-4'> = [
      'claude-sonnet', 'gemini-2.5-flash', 'gpt-4'
    ];

    for (const aiModel of aiModels) {
      const updateInput: UpdateConversationInput = {
        id: testConversationId,
        ai_model: aiModel
      };

      const result = await updateConversation(updateInput);
      expect(result.ai_model).toBe(aiModel);
    }
  });
});