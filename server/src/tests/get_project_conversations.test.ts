import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable, conversationsTable } from '../db/schema';
import { type GetProjectConversationsInput } from '../schema';
import { getProjectConversations } from '../handlers/get_project_conversations';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser = {
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: null,
  auth_provider: 'email' as const,
  auth_provider_id: 'test123',
  preferred_coding_language: 'typescript' as const,
  preferred_ai_model: 'claude-sonnet' as const
};

const testProject = {
  name: 'Test Project',
  description: 'A test project',
  coding_language: 'typescript' as const
};

describe('getProjectConversations', () => {
  let userId: number;
  let projectId: number;
  let otherProjectId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test projects
    const projectResult = await db.insert(projectsTable)
      .values({ ...testProject, user_id: userId })
      .returning()
      .execute();
    projectId = projectResult[0].id;

    const otherProjectResult = await db.insert(projectsTable)
      .values({ ...testProject, name: 'Other Project', user_id: userId })
      .returning()
      .execute();
    otherProjectId = otherProjectResult[0].id;
  });

  afterEach(resetDB);

  it('should return conversations for a specific project', async () => {
    // Create conversations for the test project
    const conversation1 = {
      project_id: projectId,
      user_id: userId,
      title: 'First Conversation',
      ai_model: 'claude-sonnet' as const
    };

    // Insert first conversation
    await db.insert(conversationsTable)
      .values(conversation1)
      .execute();

    // Add small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const conversation2 = {
      project_id: projectId,
      user_id: userId,
      title: 'Second Conversation',
      ai_model: 'gpt-4' as const
    };

    // Insert second conversation (should have more recent timestamp)
    await db.insert(conversationsTable)
      .values(conversation2)
      .execute();

    const input: GetProjectConversationsInput = {
      project_id: projectId
    };

    const result = await getProjectConversations(input);

    expect(result).toHaveLength(2);
    // Most recent should be first (ordered by updated_at desc)
    expect(result[0].title).toEqual('Second Conversation');
    expect(result[0].project_id).toEqual(projectId);
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].ai_model).toEqual('gpt-4');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    expect(result[1].title).toEqual('First Conversation');
    expect(result[1].project_id).toEqual(projectId);
    expect(result[1].ai_model).toEqual('claude-sonnet');
  });

  it('should return conversations ordered by most recent updated_at first', async () => {
    // Create conversations with specific timestamps
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const conversations = [
      {
        project_id: projectId,
        user_id: userId,
        title: 'Oldest Conversation',
        ai_model: 'claude-sonnet' as const
      },
      {
        project_id: projectId,
        user_id: userId,
        title: 'Middle Conversation',
        ai_model: 'gpt-4' as const
      },
      {
        project_id: projectId,
        user_id: userId,
        title: 'Newest Conversation',
        ai_model: 'gemini-2.5-flash' as const
      }
    ];

    // Insert conversations
    const inserted = await db.insert(conversationsTable)
      .values(conversations)
      .returning()
      .execute();

    // Update conversations with specific timestamps to ensure ordering
    await db.update(conversationsTable)
      .set({ updated_at: twoHoursAgo })
      .where(eq(conversationsTable.id, inserted[0].id))
      .execute();

    await db.update(conversationsTable)
      .set({ updated_at: oneHourAgo })
      .where(eq(conversationsTable.id, inserted[1].id))
      .execute();

    await db.update(conversationsTable)
      .set({ updated_at: now })
      .where(eq(conversationsTable.id, inserted[2].id))
      .execute();

    const input: GetProjectConversationsInput = {
      project_id: projectId
    };

    const result = await getProjectConversations(input);

    expect(result).toHaveLength(3);
    expect(result[0].title).toEqual('Newest Conversation');
    expect(result[1].title).toEqual('Middle Conversation');
    expect(result[2].title).toEqual('Oldest Conversation');

    // Verify timestamps are in descending order
    expect(result[0].updated_at >= result[1].updated_at).toBe(true);
    expect(result[1].updated_at >= result[2].updated_at).toBe(true);
  });

  it('should return empty array when project has no conversations', async () => {
    const input: GetProjectConversationsInput = {
      project_id: projectId
    };

    const result = await getProjectConversations(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should only return conversations for the specified project', async () => {
    // Create conversations for both projects
    const conversation1 = {
      project_id: projectId,
      user_id: userId,
      title: 'Project 1 Conversation',
      ai_model: 'claude-sonnet' as const
    };

    const conversation2 = {
      project_id: otherProjectId,
      user_id: userId,
      title: 'Project 2 Conversation',
      ai_model: 'gpt-4' as const
    };

    await db.insert(conversationsTable)
      .values([conversation1, conversation2])
      .execute();

    const input: GetProjectConversationsInput = {
      project_id: projectId
    };

    const result = await getProjectConversations(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Project 1 Conversation');
    expect(result[0].project_id).toEqual(projectId);

    // Verify the other project's conversation is not included
    const otherResult = result.find(conv => conv.project_id === otherProjectId);
    expect(otherResult).toBeUndefined();
  });

  it('should return empty array for non-existent project', async () => {
    const nonExistentProjectId = 99999;
    
    const input: GetProjectConversationsInput = {
      project_id: nonExistentProjectId
    };

    const result = await getProjectConversations(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle multiple conversations with same updated_at timestamp', async () => {
    const sameTimestamp = new Date();

    const conversations = [
      {
        project_id: projectId,
        user_id: userId,
        title: 'First Same Time',
        ai_model: 'claude-sonnet' as const
      },
      {
        project_id: projectId,
        user_id: userId,
        title: 'Second Same Time',
        ai_model: 'gpt-4' as const
      }
    ];

    const inserted = await db.insert(conversationsTable)
      .values(conversations)
      .returning()
      .execute();

    // Set same timestamp for both
    await db.update(conversationsTable)
      .set({ updated_at: sameTimestamp })
      .where(eq(conversationsTable.id, inserted[0].id))
      .execute();

    await db.update(conversationsTable)
      .set({ updated_at: sameTimestamp })
      .where(eq(conversationsTable.id, inserted[1].id))
      .execute();

    const input: GetProjectConversationsInput = {
      project_id: projectId
    };

    const result = await getProjectConversations(input);

    expect(result).toHaveLength(2);
    // Both conversations should be returned, order may vary for same timestamp
    const titles = result.map(conv => conv.title);
    expect(titles).toContain('First Same Time');
    expect(titles).toContain('Second Same Time');
  });
});