import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable, conversationsTable, codeSnippetsTable } from '../db/schema';
import { type GetConversationCodeSnippetsInput } from '../schema';
import { getConversationCodeSnippets } from '../handlers/get_conversation_code_snippets';

describe('getConversationCodeSnippets', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve code snippets for a conversation', async () => {
    // Create test user
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

    const userId = userResult[0].id;

    // Create test project
    const projectResult = await db.insert(projectsTable)
      .values({
        user_id: userId,
        name: 'Test Project',
        coding_language: 'typescript'
      })
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    // Create test conversation
    const conversationResult = await db.insert(conversationsTable)
      .values({
        project_id: projectId,
        user_id: userId,
        title: 'Test Conversation',
        ai_model: 'claude-sonnet'
      })
      .returning()
      .execute();

    const conversationId = conversationResult[0].id;

    // Create test code snippets with different timestamps
    const snippet1Result = await db.insert(codeSnippetsTable)
      .values({
        conversation_id: conversationId,
        title: 'First Snippet',
        code: 'console.log("Hello World");',
        language: 'javascript',
        description: 'A simple hello world'
      })
      .returning()
      .execute();

    // Wait to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const snippet2Result = await db.insert(codeSnippetsTable)
      .values({
        conversation_id: conversationId,
        title: 'Second Snippet',
        code: 'function add(a: number, b: number) { return a + b; }',
        language: 'typescript',
        description: 'An add function'
      })
      .returning()
      .execute();

    // Test the handler
    const input: GetConversationCodeSnippetsInput = {
      conversation_id: conversationId
    };

    const results = await getConversationCodeSnippets(input);

    // Verify results
    expect(results).toHaveLength(2);

    // Should be ordered by created_at desc (most recent first)
    expect(results[0].id).toEqual(snippet2Result[0].id);
    expect(results[0].title).toEqual('Second Snippet');
    expect(results[0].code).toEqual('function add(a: number, b: number) { return a + b; }');
    expect(results[0].language).toEqual('typescript');
    expect(results[0].description).toEqual('An add function');
    expect(results[0].conversation_id).toEqual(conversationId);

    expect(results[1].id).toEqual(snippet1Result[0].id);
    expect(results[1].title).toEqual('First Snippet');
    expect(results[1].code).toEqual('console.log("Hello World");');
    expect(results[1].language).toEqual('javascript');
    expect(results[1].description).toEqual('A simple hello world');
    expect(results[1].conversation_id).toEqual(conversationId);

    // Verify timestamps are properly ordered (most recent first)
    expect(results[0].created_at.getTime()).toBeGreaterThan(results[1].created_at.getTime());
  });

  it('should return empty array for conversation with no code snippets', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        auth_provider: 'email',
        auth_provider_id: 'test123',
        preferred_coding_language: 'python',
        preferred_ai_model: 'gpt-4'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test project
    const projectResult = await db.insert(projectsTable)
      .values({
        user_id: userId,
        name: 'Empty Project',
        coding_language: 'python'
      })
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    // Create test conversation
    const conversationResult = await db.insert(conversationsTable)
      .values({
        project_id: projectId,
        user_id: userId,
        title: 'Empty Conversation',
        ai_model: 'gpt-4'
      })
      .returning()
      .execute();

    const conversationId = conversationResult[0].id;

    // Test the handler with conversation that has no code snippets
    const input: GetConversationCodeSnippetsInput = {
      conversation_id: conversationId
    };

    const results = await getConversationCodeSnippets(input);

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should only return snippets for the specified conversation', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        auth_provider: 'email',
        auth_provider_id: 'test123',
        preferred_coding_language: 'go',
        preferred_ai_model: 'gemini-2.5-flash'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test project
    const projectResult = await db.insert(projectsTable)
      .values({
        user_id: userId,
        name: 'Test Project',
        coding_language: 'go'
      })
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    // Create two conversations
    const conv1Result = await db.insert(conversationsTable)
      .values({
        project_id: projectId,
        user_id: userId,
        title: 'First Conversation',
        ai_model: 'gemini-2.5-flash'
      })
      .returning()
      .execute();

    const conv2Result = await db.insert(conversationsTable)
      .values({
        project_id: projectId,
        user_id: userId,
        title: 'Second Conversation',
        ai_model: 'gemini-2.5-flash'
      })
      .returning()
      .execute();

    const conv1Id = conv1Result[0].id;
    const conv2Id = conv2Result[0].id;

    // Create code snippets for both conversations
    await db.insert(codeSnippetsTable)
      .values({
        conversation_id: conv1Id,
        title: 'Conv1 Snippet',
        code: 'package main\nfunc main() { fmt.Println("Conv1") }',
        language: 'go'
      })
      .execute();

    await db.insert(codeSnippetsTable)
      .values({
        conversation_id: conv2Id,
        title: 'Conv2 Snippet',
        code: 'package main\nfunc main() { fmt.Println("Conv2") }',
        language: 'go'
      })
      .execute();

    // Test that we only get snippets for the requested conversation
    const input: GetConversationCodeSnippetsInput = {
      conversation_id: conv1Id
    };

    const results = await getConversationCodeSnippets(input);

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('Conv1 Snippet');
    expect(results[0].conversation_id).toEqual(conv1Id);
    expect(results[0].code).toContain('Conv1');
  });

  it('should handle code snippets with all optional fields populated', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        auth_provider: 'google',
        auth_provider_id: 'google123',
        preferred_coding_language: 'rust',
        preferred_ai_model: 'claude-sonnet'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test project
    const projectResult = await db.insert(projectsTable)
      .values({
        user_id: userId,
        name: 'Rust Project',
        coding_language: 'rust',
        description: 'A project for testing Rust code'
      })
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    // Create test conversation
    const conversationResult = await db.insert(conversationsTable)
      .values({
        project_id: projectId,
        user_id: userId,
        title: 'Rust Discussion',
        ai_model: 'claude-sonnet'
      })
      .returning()
      .execute();

    const conversationId = conversationResult[0].id;

    // Create code snippet with all fields populated
    const snippetResult = await db.insert(codeSnippetsTable)
      .values({
        conversation_id: conversationId,
        message_id: null, // Testing nullable field
        title: 'Complete Rust Function',
        code: 'fn fibonacci(n: u32) -> u32 {\n    match n {\n        0 => 0,\n        1 => 1,\n        _ => fibonacci(n - 1) + fibonacci(n - 2),\n    }\n}',
        language: 'rust',
        description: 'A recursive implementation of the Fibonacci sequence'
      })
      .returning()
      .execute();

    // Test the handler
    const input: GetConversationCodeSnippetsInput = {
      conversation_id: conversationId
    };

    const results = await getConversationCodeSnippets(input);

    expect(results).toHaveLength(1);
    
    const snippet = results[0];
    expect(snippet.id).toEqual(snippetResult[0].id);
    expect(snippet.conversation_id).toEqual(conversationId);
    expect(snippet.message_id).toBeNull();
    expect(snippet.title).toEqual('Complete Rust Function');
    expect(snippet.code).toContain('fn fibonacci');
    expect(snippet.language).toEqual('rust');
    expect(snippet.description).toEqual('A recursive implementation of the Fibonacci sequence');
    expect(snippet.created_at).toBeInstanceOf(Date);
    expect(snippet.updated_at).toBeInstanceOf(Date);
  });
});