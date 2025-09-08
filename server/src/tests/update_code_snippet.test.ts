import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable, conversationsTable, messagesTable, codeSnippetsTable } from '../db/schema';
import { type UpdateCodeSnippetInput } from '../schema';
import { updateCodeSnippet } from '../handlers/update_code_snippet';
import { eq } from 'drizzle-orm';

describe('updateCodeSnippet', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testProjectId: number;
  let testConversationId: number;
  let testMessageId: number;
  let testSnippetId: number;

  // Create test data before each test
  beforeEach(async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        auth_provider: 'email',
        auth_provider_id: 'test123',
        preferred_coding_language: 'javascript',
        preferred_ai_model: 'claude-sonnet'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create project
    const projectResult = await db.insert(projectsTable)
      .values({
        user_id: testUserId,
        name: 'Test Project',
        description: 'A test project',
        coding_language: 'javascript'
      })
      .returning()
      .execute();
    testProjectId = projectResult[0].id;

    // Create conversation
    const conversationResult = await db.insert(conversationsTable)
      .values({
        project_id: testProjectId,
        user_id: testUserId,
        title: 'Test Conversation',
        ai_model: 'claude-sonnet'
      })
      .returning()
      .execute();
    testConversationId = conversationResult[0].id;

    // Create message
    const messageResult = await db.insert(messagesTable)
      .values({
        conversation_id: testConversationId,
        role: 'user',
        content: 'Test message'
      })
      .returning()
      .execute();
    testMessageId = messageResult[0].id;

    // Create code snippet
    const snippetResult = await db.insert(codeSnippetsTable)
      .values({
        conversation_id: testConversationId,
        message_id: testMessageId,
        title: 'Original Title',
        code: 'console.log("original");',
        language: 'javascript',
        description: 'Original description'
      })
      .returning()
      .execute();
    testSnippetId = snippetResult[0].id;
  });

  it('should update code snippet title', async () => {
    const input: UpdateCodeSnippetInput = {
      id: testSnippetId,
      title: 'Updated Title'
    };

    const result = await updateCodeSnippet(input);

    expect(result.id).toBe(testSnippetId);
    expect(result.title).toBe('Updated Title');
    expect(result.code).toBe('console.log("original");');
    expect(result.language).toBe('javascript');
    expect(result.description).toBe('Original description');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update code snippet code content', async () => {
    const input: UpdateCodeSnippetInput = {
      id: testSnippetId,
      code: 'console.log("updated code");'
    };

    const result = await updateCodeSnippet(input);

    expect(result.id).toBe(testSnippetId);
    expect(result.title).toBe('Original Title');
    expect(result.code).toBe('console.log("updated code");');
    expect(result.language).toBe('javascript');
    expect(result.description).toBe('Original description');
  });

  it('should update code snippet language', async () => {
    const input: UpdateCodeSnippetInput = {
      id: testSnippetId,
      language: 'python'
    };

    const result = await updateCodeSnippet(input);

    expect(result.id).toBe(testSnippetId);
    expect(result.title).toBe('Original Title');
    expect(result.code).toBe('console.log("original");');
    expect(result.language).toBe('python');
    expect(result.description).toBe('Original description');
  });

  it('should update code snippet description to new value', async () => {
    const input: UpdateCodeSnippetInput = {
      id: testSnippetId,
      description: 'Updated description'
    };

    const result = await updateCodeSnippet(input);

    expect(result.id).toBe(testSnippetId);
    expect(result.title).toBe('Original Title');
    expect(result.code).toBe('console.log("original");');
    expect(result.language).toBe('javascript');
    expect(result.description).toBe('Updated description');
  });

  it('should update code snippet description to null', async () => {
    const input: UpdateCodeSnippetInput = {
      id: testSnippetId,
      description: null
    };

    const result = await updateCodeSnippet(input);

    expect(result.id).toBe(testSnippetId);
    expect(result.title).toBe('Original Title');
    expect(result.code).toBe('console.log("original");');
    expect(result.language).toBe('javascript');
    expect(result.description).toBe(null);
  });

  it('should update multiple fields simultaneously', async () => {
    const input: UpdateCodeSnippetInput = {
      id: testSnippetId,
      title: 'Multi Update Title',
      code: 'print("python code")',
      language: 'python',
      description: 'Multi update description'
    };

    const result = await updateCodeSnippet(input);

    expect(result.id).toBe(testSnippetId);
    expect(result.title).toBe('Multi Update Title');
    expect(result.code).toBe('print("python code")');
    expect(result.language).toBe('python');
    expect(result.description).toBe('Multi update description');
    expect(result.conversation_id).toBe(testConversationId);
    expect(result.message_id).toBe(testMessageId);
  });

  it('should update the updated_at timestamp', async () => {
    // Get original snippet to compare timestamps
    const originalSnippet = await db.select()
      .from(codeSnippetsTable)
      .where(eq(codeSnippetsTable.id, testSnippetId))
      .execute();
    
    const originalUpdatedAt = originalSnippet[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateCodeSnippetInput = {
      id: testSnippetId,
      title: 'Timestamp Test'
    };

    const result = await updateCodeSnippet(input);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    expect(result.created_at).toEqual(originalSnippet[0].created_at);
  });

  it('should persist changes in database', async () => {
    const input: UpdateCodeSnippetInput = {
      id: testSnippetId,
      title: 'Persistence Test',
      code: 'console.log("persistence");'
    };

    await updateCodeSnippet(input);

    // Verify changes are persisted in database
    const savedSnippet = await db.select()
      .from(codeSnippetsTable)
      .where(eq(codeSnippetsTable.id, testSnippetId))
      .execute();

    expect(savedSnippet).toHaveLength(1);
    expect(savedSnippet[0].title).toBe('Persistence Test');
    expect(savedSnippet[0].code).toBe('console.log("persistence");');
    expect(savedSnippet[0].language).toBe('javascript');
    expect(savedSnippet[0].description).toBe('Original description');
  });

  it('should throw error when code snippet does not exist', async () => {
    const input: UpdateCodeSnippetInput = {
      id: 999999, // Non-existent ID
      title: 'Non-existent'
    };

    expect(async () => {
      await updateCodeSnippet(input);
    }).toThrow(/Code snippet with id 999999 not found/i);
  });

  it('should handle code snippet without message association', async () => {
    // Create snippet without message_id
    const snippetWithoutMessageResult = await db.insert(codeSnippetsTable)
      .values({
        conversation_id: testConversationId,
        message_id: null,
        title: 'No Message Snippet',
        code: 'console.log("no message");',
        language: 'typescript',
        description: null
      })
      .returning()
      .execute();

    const input: UpdateCodeSnippetInput = {
      id: snippetWithoutMessageResult[0].id,
      title: 'Updated No Message',
      description: 'Added description'
    };

    const result = await updateCodeSnippet(input);

    expect(result.id).toBe(snippetWithoutMessageResult[0].id);
    expect(result.title).toBe('Updated No Message');
    expect(result.message_id).toBe(null);
    expect(result.description).toBe('Added description');
  });
});