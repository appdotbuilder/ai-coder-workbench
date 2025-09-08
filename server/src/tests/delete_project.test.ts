import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  projectsTable, 
  conversationsTable, 
  messagesTable, 
  codeSnippetsTable 
} from '../db/schema';
import { deleteProject } from '../handlers/delete_project';
import { eq } from 'drizzle-orm';

describe('deleteProject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a project owned by the user', async () => {
    // Create a user first
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

    // Create a project
    const projectResult = await db.insert(projectsTable)
      .values({
        user_id: userId,
        name: 'Test Project',
        description: 'A test project',
        coding_language: 'typescript'
      })
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    // Delete the project
    const result = await deleteProject(projectId, userId);

    expect(result).toBe(true);

    // Verify project was deleted
    const projects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .execute();

    expect(projects).toHaveLength(0);
  });

  it('should return false when project does not exist', async () => {
    // Create a user first
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
    const nonExistentProjectId = 999;

    const result = await deleteProject(nonExistentProjectId, userId);

    expect(result).toBe(false);
  });

  it('should return false when user does not own the project', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        name: 'User One',
        auth_provider: 'email',
        auth_provider_id: 'user1',
        preferred_coding_language: 'typescript',
        preferred_ai_model: 'claude-sonnet'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        name: 'User Two',
        auth_provider: 'email',
        auth_provider_id: 'user2',
        preferred_coding_language: 'python',
        preferred_ai_model: 'gpt-4'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create project owned by user1
    const projectResult = await db.insert(projectsTable)
      .values({
        user_id: user1Id,
        name: 'User 1 Project',
        description: 'Project owned by user 1',
        coding_language: 'typescript'
      })
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    // Try to delete with user2 (should fail)
    const result = await deleteProject(projectId, user2Id);

    expect(result).toBe(false);

    // Verify project still exists
    const projects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .execute();

    expect(projects).toHaveLength(1);
    expect(projects[0].user_id).toBe(user1Id);
  });

  it('should cascade delete conversations, messages, and code snippets', async () => {
    // Create a user
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

    // Create a project
    const projectResult = await db.insert(projectsTable)
      .values({
        user_id: userId,
        name: 'Test Project',
        description: 'A test project',
        coding_language: 'typescript'
      })
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    // Create a conversation
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

    // Create a message
    const messageResult = await db.insert(messagesTable)
      .values({
        conversation_id: conversationId,
        role: 'user',
        content: 'Hello, world!'
      })
      .returning()
      .execute();

    const messageId = messageResult[0].id;

    // Create a code snippet
    await db.insert(codeSnippetsTable)
      .values({
        conversation_id: conversationId,
        message_id: messageId,
        title: 'Test Snippet',
        code: 'console.log("Hello, world!");',
        language: 'typescript',
        description: 'A test code snippet'
      })
      .execute();

    // Verify data exists before deletion
    const beforeConversations = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.project_id, projectId))
      .execute();
    expect(beforeConversations).toHaveLength(1);

    const beforeMessages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.conversation_id, conversationId))
      .execute();
    expect(beforeMessages).toHaveLength(1);

    const beforeCodeSnippets = await db.select()
      .from(codeSnippetsTable)
      .where(eq(codeSnippetsTable.conversation_id, conversationId))
      .execute();
    expect(beforeCodeSnippets).toHaveLength(1);

    // Delete the project
    const result = await deleteProject(projectId, userId);
    expect(result).toBe(true);

    // Verify all related data was cascade deleted
    const afterConversations = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.project_id, projectId))
      .execute();
    expect(afterConversations).toHaveLength(0);

    const afterMessages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.conversation_id, conversationId))
      .execute();
    expect(afterMessages).toHaveLength(0);

    const afterCodeSnippets = await db.select()
      .from(codeSnippetsTable)
      .where(eq(codeSnippetsTable.conversation_id, conversationId))
      .execute();
    expect(afterCodeSnippets).toHaveLength(0);
  });

  it('should handle multiple projects for the same user', async () => {
    // Create a user
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

    // Create multiple projects
    const project1Result = await db.insert(projectsTable)
      .values({
        user_id: userId,
        name: 'Project 1',
        coding_language: 'typescript'
      })
      .returning()
      .execute();

    const project2Result = await db.insert(projectsTable)
      .values({
        user_id: userId,
        name: 'Project 2',
        coding_language: 'python'
      })
      .returning()
      .execute();

    const project1Id = project1Result[0].id;
    const project2Id = project2Result[0].id;

    // Delete only project 1
    const result = await deleteProject(project1Id, userId);
    expect(result).toBe(true);

    // Verify project 1 was deleted but project 2 remains
    const project1Check = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, project1Id))
      .execute();
    expect(project1Check).toHaveLength(0);

    const project2Check = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, project2Id))
      .execute();
    expect(project2Check).toHaveLength(1);
    expect(project2Check[0].name).toBe('Project 2');
  });
});