import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable, conversationsTable, messagesTable, codeSnippetsTable } from '../db/schema';
import { type CreateCodeSnippetInput } from '../schema';
import { createCodeSnippet } from '../handlers/create_code_snippet';
import { eq } from 'drizzle-orm';

// Test data setup
let testUserId: number;
let testProjectId: number;
let testConversationId: number;
let testMessageId: number;

const testInput: CreateCodeSnippetInput = {
  conversation_id: 0, // Will be set in beforeEach
  message_id: null,
  title: 'Test Code Snippet',
  code: 'function test() { return "hello world"; }',
  language: 'javascript',
  description: 'A simple test function'
};

describe('createCodeSnippet', () => {
  beforeEach(async () => {
    await createDB();

    // Create prerequisite data
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

    const projectResult = await db.insert(projectsTable)
      .values({
        user_id: testUserId,
        name: 'Test Project',
        coding_language: 'javascript'
      })
      .returning()
      .execute();
    testProjectId = projectResult[0].id;

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

    const messageResult = await db.insert(messagesTable)
      .values({
        conversation_id: testConversationId,
        role: 'user',
        content: 'Test message content'
      })
      .returning()
      .execute();
    testMessageId = messageResult[0].id;

    // Update test input with actual conversation_id
    testInput.conversation_id = testConversationId;
  });

  afterEach(resetDB);

  it('should create a code snippet without message association', async () => {
    const result = await createCodeSnippet(testInput);

    // Verify returned data
    expect(result.title).toEqual('Test Code Snippet');
    expect(result.code).toEqual('function test() { return "hello world"; }');
    expect(result.language).toEqual('javascript');
    expect(result.description).toEqual('A simple test function');
    expect(result.conversation_id).toEqual(testConversationId);
    expect(result.message_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a code snippet with message association', async () => {
    const inputWithMessage = {
      ...testInput,
      message_id: testMessageId
    };

    const result = await createCodeSnippet(inputWithMessage);

    // Verify returned data
    expect(result.title).toEqual('Test Code Snippet');
    expect(result.code).toEqual('function test() { return "hello world"; }');
    expect(result.language).toEqual('javascript');
    expect(result.description).toEqual('A simple test function');
    expect(result.conversation_id).toEqual(testConversationId);
    expect(result.message_id).toEqual(testMessageId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save code snippet to database', async () => {
    const result = await createCodeSnippet(testInput);

    // Query database to verify record was saved
    const codeSnippets = await db.select()
      .from(codeSnippetsTable)
      .where(eq(codeSnippetsTable.id, result.id))
      .execute();

    expect(codeSnippets).toHaveLength(1);
    expect(codeSnippets[0].title).toEqual('Test Code Snippet');
    expect(codeSnippets[0].code).toEqual('function test() { return "hello world"; }');
    expect(codeSnippets[0].language).toEqual('javascript');
    expect(codeSnippets[0].description).toEqual('A simple test function');
    expect(codeSnippets[0].conversation_id).toEqual(testConversationId);
    expect(codeSnippets[0].message_id).toBeNull();
    expect(codeSnippets[0].created_at).toBeInstanceOf(Date);
    expect(codeSnippets[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create code snippet without description', async () => {
    const inputWithoutDescription = {
      ...testInput,
      description: undefined
    };

    const result = await createCodeSnippet(inputWithoutDescription);

    expect(result.description).toBeNull();
    expect(result.title).toEqual('Test Code Snippet');
    expect(result.code).toEqual('function test() { return "hello world"; }');
  });

  it('should handle different programming languages', async () => {
    const pythonInput = {
      ...testInput,
      title: 'Python Code Snippet',
      code: 'def test():\n    return "hello world"',
      language: 'python' as const
    };

    const result = await createCodeSnippet(pythonInput);

    expect(result.language).toEqual('python');
    expect(result.code).toEqual('def test():\n    return "hello world"');
    expect(result.title).toEqual('Python Code Snippet');
  });

  it('should throw error when conversation does not exist', async () => {
    const inputWithInvalidConversation = {
      ...testInput,
      conversation_id: 99999
    };

    await expect(createCodeSnippet(inputWithInvalidConversation))
      .rejects.toThrow(/conversation with id 99999 not found/i);
  });

  it('should throw error when message does not exist', async () => {
    const inputWithInvalidMessage = {
      ...testInput,
      message_id: 99999
    };

    await expect(createCodeSnippet(inputWithInvalidMessage))
      .rejects.toThrow(/message with id 99999 not found/i);
  });

  it('should throw error when message does not belong to conversation', async () => {
    // Create another conversation
    const anotherConversationResult = await db.insert(conversationsTable)
      .values({
        project_id: testProjectId,
        user_id: testUserId,
        title: 'Another Conversation',
        ai_model: 'claude-sonnet'
      })
      .returning()
      .execute();
    const anotherConversationId = anotherConversationResult[0].id;

    // Try to create code snippet with message from different conversation
    const inputWithWrongMessage = {
      ...testInput,
      conversation_id: anotherConversationId,
      message_id: testMessageId
    };

    await expect(createCodeSnippet(inputWithWrongMessage))
      .rejects.toThrow(/message .* does not belong to conversation/i);
  });
});