import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable, conversationsTable, messagesTable } from '../db/schema';
import { type CreateMessageInput } from '../schema';
import { createMessage } from '../handlers/create_message';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'test@example.com',
  name: 'Test User',
  auth_provider: 'email' as const,
  auth_provider_id: 'test123',
  preferred_coding_language: 'javascript' as const,
  preferred_ai_model: 'claude-sonnet' as const
};

const testProject = {
  name: 'Test Project',
  description: 'A test project',
  coding_language: 'javascript' as const
};

const testConversation = {
  title: 'Test Conversation',
  ai_model: 'claude-sonnet' as const
};

describe('createMessage', () => {
  let userId: number;
  let projectId: number;
  let conversationId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    const projectResult = await db.insert(projectsTable)
      .values({
        ...testProject,
        user_id: userId
      })
      .returning()
      .execute();
    projectId = projectResult[0].id;

    const conversationResult = await db.insert(conversationsTable)
      .values({
        ...testConversation,
        project_id: projectId,
        user_id: userId
      })
      .returning()
      .execute();
    conversationId = conversationResult[0].id;
  });

  afterEach(resetDB);

  it('should create a user message successfully', async () => {
    const messageInput: CreateMessageInput = {
      conversation_id: conversationId,
      role: 'user',
      content: 'Hello, can you help me with this code?'
    };

    const result = await createMessage(messageInput);

    expect(result.conversation_id).toBe(conversationId);
    expect(result.role).toBe('user');
    expect(result.content).toBe('Hello, can you help me with this code?');
    expect(result.metadata).toBe(null);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create an assistant message successfully', async () => {
    const messageInput: CreateMessageInput = {
      conversation_id: conversationId,
      role: 'assistant',
      content: 'Sure! I can help you with your code. What specific issue are you facing?'
    };

    const result = await createMessage(messageInput);

    expect(result.conversation_id).toBe(conversationId);
    expect(result.role).toBe('assistant');
    expect(result.content).toBe('Sure! I can help you with your code. What specific issue are you facing?');
    expect(result.metadata).toBe(null);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a message with metadata', async () => {
    const metadata = {
      model_parameters: {
        temperature: 0.7,
        max_tokens: 1000
      },
      source: 'api_call',
      context: 'debugging_session'
    };

    const messageInput: CreateMessageInput = {
      conversation_id: conversationId,
      role: 'assistant',
      content: 'Here is the code analysis...',
      metadata: metadata
    };

    const result = await createMessage(messageInput);

    expect(result.conversation_id).toBe(conversationId);
    expect(result.role).toBe('assistant');
    expect(result.content).toBe('Here is the code analysis...');
    expect(result.metadata).toEqual(metadata);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save message to database correctly', async () => {
    const messageInput: CreateMessageInput = {
      conversation_id: conversationId,
      role: 'user',
      content: 'Test message for database verification',
      metadata: { test: true }
    };

    const result = await createMessage(messageInput);

    // Verify message was saved to database
    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].conversation_id).toBe(conversationId);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('Test message for database verification');
    expect(messages[0].metadata).toEqual({ test: true });
    expect(messages[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle null metadata correctly', async () => {
    const messageInput: CreateMessageInput = {
      conversation_id: conversationId,
      role: 'user',
      content: 'Message without metadata',
      metadata: null
    };

    const result = await createMessage(messageInput);

    expect(result.metadata).toBe(null);

    // Verify in database
    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, result.id))
      .execute();

    expect(messages[0].metadata).toBe(null);
  });

  it('should handle undefined metadata correctly', async () => {
    const messageInput: CreateMessageInput = {
      conversation_id: conversationId,
      role: 'user',
      content: 'Message with undefined metadata'
      // metadata is undefined (optional field)
    };

    const result = await createMessage(messageInput);

    expect(result.metadata).toBe(null);

    // Verify in database
    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, result.id))
      .execute();

    expect(messages[0].metadata).toBe(null);
  });

  it('should throw error when conversation does not exist', async () => {
    const nonExistentConversationId = 99999;
    
    const messageInput: CreateMessageInput = {
      conversation_id: nonExistentConversationId,
      role: 'user',
      content: 'This should fail'
    };

    await expect(createMessage(messageInput)).rejects.toThrow(/conversation.*not found/i);
  });

  it('should maintain message order by creation time', async () => {
    const messages = [
      {
        conversation_id: conversationId,
        role: 'user' as const,
        content: 'First message'
      },
      {
        conversation_id: conversationId,
        role: 'assistant' as const,
        content: 'Second message'
      },
      {
        conversation_id: conversationId,
        role: 'user' as const,
        content: 'Third message'
      }
    ];

    const results = [];
    for (const messageInput of messages) {
      const result = await createMessage(messageInput);
      results.push(result);
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    // Verify creation order
    expect(results[0].created_at <= results[1].created_at).toBe(true);
    expect(results[1].created_at <= results[2].created_at).toBe(true);

    // Verify all messages exist in database
    const dbMessages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.conversation_id, conversationId))
      .execute();

    expect(dbMessages).toHaveLength(3);
  });

  it('should handle complex metadata objects', async () => {
    const complexMetadata = {
      ai_model_info: {
        name: 'claude-sonnet',
        version: '3.5',
        temperature: 0.7
      },
      processing_stats: {
        tokens_used: 150,
        processing_time_ms: 234,
        cached: false
      },
      user_preferences: {
        code_style: 'typescript',
        explanation_level: 'detailed'
      },
      nested_array: [
        { key: 'value1', number: 42 },
        { key: 'value2', number: 84 }
      ]
    };

    const messageInput: CreateMessageInput = {
      conversation_id: conversationId,
      role: 'assistant',
      content: 'Response with complex metadata',
      metadata: complexMetadata
    };

    const result = await createMessage(messageInput);

    expect(result.metadata).toEqual(complexMetadata);

    // Verify complex metadata is preserved in database
    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, result.id))
      .execute();

    expect(messages[0].metadata).toEqual(complexMetadata);
  });
});