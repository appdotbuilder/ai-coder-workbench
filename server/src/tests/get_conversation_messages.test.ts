import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable, conversationsTable, messagesTable } from '../db/schema';
import { type GetConversationMessagesInput } from '../schema';
import { getConversationMessages } from '../handlers/get_conversation_messages';

// Test data setup
const testUser = {
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: 'https://example.com/avatar.png',
  auth_provider: 'email' as const,
  auth_provider_id: 'email_123',
  preferred_coding_language: 'typescript' as const,
  preferred_ai_model: 'claude-sonnet' as const
};

const testProject = {
  user_id: 1,
  name: 'Test Project',
  description: 'A project for testing',
  coding_language: 'typescript' as const
};

const testConversation = {
  project_id: 1,
  user_id: 1,
  title: 'Test Conversation',
  ai_model: 'claude-sonnet' as const
};

const testMessages = [
  {
    conversation_id: 1,
    role: 'user' as const,
    content: 'Hello, can you help me with TypeScript?',
    metadata: { timestamp: '2024-01-01T10:00:00Z' }
  },
  {
    conversation_id: 1,
    role: 'assistant' as const,
    content: 'Of course! I\'d be happy to help you with TypeScript. What specific topic would you like to explore?',
    metadata: { model: 'claude-sonnet', response_time: 1.2 }
  },
  {
    conversation_id: 1,
    role: 'user' as const,
    content: 'Can you explain interfaces vs types?',
    metadata: null
  },
  {
    conversation_id: 1,
    role: 'assistant' as const,
    content: 'Great question! Both interfaces and types can define object shapes, but they have some differences...',
    metadata: { model: 'claude-sonnet', response_time: 2.1, tokens_used: 150 }
  }
];

const testInput: GetConversationMessagesInput = {
  conversation_id: 1
};

describe('getConversationMessages', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return messages for a conversation in chronological order', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser);
    await db.insert(projectsTable).values(testProject);
    await db.insert(conversationsTable).values(testConversation);
    
    // Insert messages with slight delays to ensure different timestamps
    await db.insert(messagesTable).values(testMessages[0]);
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
    await db.insert(messagesTable).values(testMessages[1]);
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
    await db.insert(messagesTable).values(testMessages[2]);
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
    await db.insert(messagesTable).values(testMessages[3]);

    const result = await getConversationMessages(testInput);

    expect(result).toHaveLength(4);
    
    // Verify chronological order
    expect(result[0].role).toEqual('user');
    expect(result[0].content).toEqual('Hello, can you help me with TypeScript?');
    expect(result[1].role).toEqual('assistant');
    expect(result[1].content).toContain('Of course!');
    expect(result[2].role).toEqual('user');
    expect(result[2].content).toEqual('Can you explain interfaces vs types?');
    expect(result[3].role).toEqual('assistant');
    expect(result[3].content).toContain('Great question!');

    // Verify timestamps are in ascending order
    for (let i = 1; i < result.length; i++) {
      expect(result[i].created_at >= result[i - 1].created_at).toBe(true);
    }
  });

  it('should return all message fields correctly', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser);
    await db.insert(projectsTable).values(testProject);
    await db.insert(conversationsTable).values(testConversation);
    await db.insert(messagesTable).values(testMessages[0]);

    const result = await getConversationMessages(testInput);

    expect(result).toHaveLength(1);
    const message = result[0];

    // Verify all fields are present and correct
    expect(message.id).toBeDefined();
    expect(message.conversation_id).toEqual(1);
    expect(message.role).toEqual('user');
    expect(message.content).toEqual('Hello, can you help me with TypeScript?');
    expect(message.metadata).toEqual({ timestamp: '2024-01-01T10:00:00Z' });
    expect(message.created_at).toBeInstanceOf(Date);
  });

  it('should handle messages with null metadata', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser);
    await db.insert(projectsTable).values(testProject);
    await db.insert(conversationsTable).values(testConversation);
    await db.insert(messagesTable).values({
      conversation_id: 1,
      role: 'user',
      content: 'Test message with null metadata',
      metadata: null
    });

    const result = await getConversationMessages(testInput);

    expect(result).toHaveLength(1);
    expect(result[0].metadata).toBeNull();
    expect(result[0].content).toEqual('Test message with null metadata');
  });

  it('should return empty array for conversation with no messages', async () => {
    // Create prerequisite data but no messages
    await db.insert(usersTable).values(testUser);
    await db.insert(projectsTable).values(testProject);
    await db.insert(conversationsTable).values(testConversation);

    const result = await getConversationMessages(testInput);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return empty array for non-existent conversation', async () => {
    const nonExistentInput: GetConversationMessagesInput = {
      conversation_id: 999
    };

    const result = await getConversationMessages(nonExistentInput);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should handle complex metadata objects', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser);
    await db.insert(projectsTable).values(testProject);
    await db.insert(conversationsTable).values(testConversation);

    const complexMetadata = {
      model: 'claude-sonnet',
      response_time: 2.5,
      tokens_used: 300,
      context_length: 4096,
      confidence_score: 0.95,
      tags: ['typescript', 'interfaces'],
      reasoning_steps: [
        'Analyzed question',
        'Retrieved relevant knowledge',
        'Formulated response'
      ]
    };

    await db.insert(messagesTable).values({
      conversation_id: 1,
      role: 'assistant',
      content: 'Complex response with detailed metadata',
      metadata: complexMetadata
    });

    const result = await getConversationMessages(testInput);

    expect(result).toHaveLength(1);
    expect(result[0].metadata).toEqual(complexMetadata);
    expect(result[0].metadata?.['model']).toEqual('claude-sonnet');
    expect(result[0].metadata?.['tokens_used']).toEqual(300);
    expect(result[0].metadata?.['tags']).toEqual(['typescript', 'interfaces']);
  });

  it('should filter messages by conversation_id correctly', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser);
    await db.insert(projectsTable).values(testProject);
    await db.insert(conversationsTable).values(testConversation);
    
    // Create second conversation
    await db.insert(conversationsTable).values({
      id: 2,
      project_id: 1,
      user_id: 1,
      title: 'Second Conversation',
      ai_model: 'claude-sonnet'
    });

    // Add messages to first conversation
    await db.insert(messagesTable).values([
      { conversation_id: 1, role: 'user', content: 'Message for conversation 1' },
      { conversation_id: 1, role: 'assistant', content: 'Response for conversation 1' }
    ]);

    // Add messages to second conversation
    await db.insert(messagesTable).values([
      { conversation_id: 2, role: 'user', content: 'Message for conversation 2' },
      { conversation_id: 2, role: 'assistant', content: 'Response for conversation 2' }
    ]);

    // Query first conversation
    const result1 = await getConversationMessages({ conversation_id: 1 });
    expect(result1).toHaveLength(2);
    expect(result1[0].content).toEqual('Message for conversation 1');
    expect(result1[1].content).toEqual('Response for conversation 1');

    // Query second conversation
    const result2 = await getConversationMessages({ conversation_id: 2 });
    expect(result2).toHaveLength(2);
    expect(result2[0].content).toEqual('Message for conversation 2');
    expect(result2[1].content).toEqual('Response for conversation 2');
  });
});