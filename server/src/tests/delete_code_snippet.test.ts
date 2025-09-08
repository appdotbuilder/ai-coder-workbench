import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable, conversationsTable, codeSnippetsTable } from '../db/schema';
import { deleteCodeSnippet } from '../handlers/delete_code_snippet';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'testuser@example.com',
  name: 'Test User',
  auth_provider: 'email' as const,
  auth_provider_id: 'test123',
  preferred_coding_language: 'typescript' as const,
  preferred_ai_model: 'claude-sonnet' as const
};

const otherUser = {
  email: 'otheruser@example.com',
  name: 'Other User',
  auth_provider: 'email' as const,
  auth_provider_id: 'other123',
  preferred_coding_language: 'javascript' as const,
  preferred_ai_model: 'gpt-4' as const
};

describe('deleteCodeSnippet', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully delete a code snippet when user has access', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create test project
    const [project] = await db.insert(projectsTable)
      .values({
        user_id: user.id,
        name: 'Test Project',
        description: 'A project for testing',
        coding_language: 'typescript'
      })
      .returning()
      .execute();

    // Create test conversation
    const [conversation] = await db.insert(conversationsTable)
      .values({
        project_id: project.id,
        user_id: user.id,
        title: 'Test Conversation',
        ai_model: 'claude-sonnet'
      })
      .returning()
      .execute();

    // Create test code snippet
    const [codeSnippet] = await db.insert(codeSnippetsTable)
      .values({
        conversation_id: conversation.id,
        title: 'Test Snippet',
        code: 'console.log("Hello World");',
        language: 'javascript',
        description: 'A test code snippet'
      })
      .returning()
      .execute();

    // Delete the code snippet
    const result = await deleteCodeSnippet(codeSnippet.id, user.id);

    // Should return true for successful deletion
    expect(result).toBe(true);

    // Verify snippet is deleted from database
    const snippets = await db.select()
      .from(codeSnippetsTable)
      .where(eq(codeSnippetsTable.id, codeSnippet.id))
      .execute();

    expect(snippets).toHaveLength(0);
  });

  it('should return false when snippet does not exist', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Try to delete non-existent snippet
    const result = await deleteCodeSnippet(999, user.id);

    expect(result).toBe(false);
  });

  it('should return false when user does not have access to snippet', async () => {
    // Create test users
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [unauthorizedUser] = await db.insert(usersTable)
      .values(otherUser)
      .returning()
      .execute();

    // Create test project for the authorized user
    const [project] = await db.insert(projectsTable)
      .values({
        user_id: user.id,
        name: 'Test Project',
        description: 'A project for testing',
        coding_language: 'typescript'
      })
      .returning()
      .execute();

    // Create test conversation for the authorized user
    const [conversation] = await db.insert(conversationsTable)
      .values({
        project_id: project.id,
        user_id: user.id,
        title: 'Test Conversation',
        ai_model: 'claude-sonnet'
      })
      .returning()
      .execute();

    // Create test code snippet
    const [codeSnippet] = await db.insert(codeSnippetsTable)
      .values({
        conversation_id: conversation.id,
        title: 'Test Snippet',
        code: 'console.log("Hello World");',
        language: 'javascript',
        description: 'A test code snippet'
      })
      .returning()
      .execute();

    // Try to delete snippet with unauthorized user
    const result = await deleteCodeSnippet(codeSnippet.id, unauthorizedUser.id);

    expect(result).toBe(false);

    // Verify snippet still exists in database
    const snippets = await db.select()
      .from(codeSnippetsTable)
      .where(eq(codeSnippetsTable.id, codeSnippet.id))
      .execute();

    expect(snippets).toHaveLength(1);
    expect(snippets[0].title).toEqual('Test Snippet');
  });

  it('should handle deletion of snippet with null message_id', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create test project
    const [project] = await db.insert(projectsTable)
      .values({
        user_id: user.id,
        name: 'Test Project',
        description: 'A project for testing',
        coding_language: 'typescript'
      })
      .returning()
      .execute();

    // Create test conversation
    const [conversation] = await db.insert(conversationsTable)
      .values({
        project_id: project.id,
        user_id: user.id,
        title: 'Test Conversation',
        ai_model: 'claude-sonnet'
      })
      .returning()
      .execute();

    // Create test code snippet with no message association
    const [codeSnippet] = await db.insert(codeSnippetsTable)
      .values({
        conversation_id: conversation.id,
        message_id: null, // Explicitly set to null
        title: 'Standalone Snippet',
        code: 'function test() { return true; }',
        language: 'javascript',
        description: 'A standalone code snippet'
      })
      .returning()
      .execute();

    // Delete the code snippet
    const result = await deleteCodeSnippet(codeSnippet.id, user.id);

    // Should return true for successful deletion
    expect(result).toBe(true);

    // Verify snippet is deleted from database
    const snippets = await db.select()
      .from(codeSnippetsTable)
      .where(eq(codeSnippetsTable.id, codeSnippet.id))
      .execute();

    expect(snippets).toHaveLength(0);
  });

  it('should validate ownership through conversation relationship', async () => {
    // Create two separate users with their own projects/conversations
    const [user1] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values(otherUser)
      .returning()
      .execute();

    // Create project for user1
    const [project1] = await db.insert(projectsTable)
      .values({
        user_id: user1.id,
        name: 'User1 Project',
        description: 'Project belonging to user1',
        coding_language: 'typescript'
      })
      .returning()
      .execute();

    // Create project for user2
    const [project2] = await db.insert(projectsTable)
      .values({
        user_id: user2.id,
        name: 'User2 Project',
        description: 'Project belonging to user2',
        coding_language: 'python'
      })
      .returning()
      .execute();

    // Create conversation for user1
    const [conversation1] = await db.insert(conversationsTable)
      .values({
        project_id: project1.id,
        user_id: user1.id,
        title: 'User1 Conversation',
        ai_model: 'claude-sonnet'
      })
      .returning()
      .execute();

    // Create conversation for user2
    const [conversation2] = await db.insert(conversationsTable)
      .values({
        project_id: project2.id,
        user_id: user2.id,
        title: 'User2 Conversation',
        ai_model: 'gpt-4'
      })
      .returning()
      .execute();

    // Create code snippet in user1's conversation
    const [snippet1] = await db.insert(codeSnippetsTable)
      .values({
        conversation_id: conversation1.id,
        title: 'User1 Snippet',
        code: 'console.log("User1");',
        language: 'javascript'
      })
      .returning()
      .execute();

    // Create code snippet in user2's conversation
    const [snippet2] = await db.insert(codeSnippetsTable)
      .values({
        conversation_id: conversation2.id,
        title: 'User2 Snippet',
        code: 'print("User2")',
        language: 'python'
      })
      .returning()
      .execute();

    // User1 should be able to delete their own snippet
    const result1 = await deleteCodeSnippet(snippet1.id, user1.id);
    expect(result1).toBe(true);

    // User1 should NOT be able to delete user2's snippet
    const result2 = await deleteCodeSnippet(snippet2.id, user1.id);
    expect(result2).toBe(false);

    // Verify user1's snippet is deleted but user2's snippet remains
    const remainingSnippets = await db.select()
      .from(codeSnippetsTable)
      .execute();

    expect(remainingSnippets).toHaveLength(1);
    expect(remainingSnippets[0].title).toEqual('User2 Snippet');
  });
});