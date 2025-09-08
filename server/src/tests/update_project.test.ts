import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable } from '../db/schema';
import { type UpdateProjectInput, type CreateUserInput, type CreateProjectInput } from '../schema';
import { updateProject } from '../handlers/update_project';
import { eq } from 'drizzle-orm';

// Test user data
const testUser: CreateUserInput = {
  email: 'testuser@example.com',
  name: 'Test User',
  auth_provider: 'email',
  auth_provider_id: 'test123',
  preferred_coding_language: 'javascript',
  preferred_ai_model: 'claude-sonnet'
};

// Test project data
const testProject: CreateProjectInput = {
  user_id: 1, // Will be set after user creation
  name: 'Original Project',
  description: 'Original description',
  coding_language: 'javascript'
};

describe('updateProject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let projectId: number;

  beforeEach(async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test project
    const projectResult = await db.insert(projectsTable)
      .values({
        ...testProject,
        user_id: userId
      })
      .returning()
      .execute();
    projectId = projectResult[0].id;
  });

  it('should update project name only', async () => {
    const updateInput: UpdateProjectInput = {
      id: projectId,
      name: 'Updated Project Name'
    };

    const result = await updateProject(updateInput);

    // Verify updated fields
    expect(result.name).toEqual('Updated Project Name');
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.coding_language).toEqual('javascript'); // Should remain unchanged
    expect(result.user_id).toEqual(userId);
    expect(result.id).toEqual(projectId);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify in database
    const dbProject = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .execute();

    expect(dbProject[0].name).toEqual('Updated Project Name');
    expect(dbProject[0].description).toEqual('Original description');
  });

  it('should update description to null', async () => {
    const updateInput: UpdateProjectInput = {
      id: projectId,
      description: null
    };

    const result = await updateProject(updateInput);

    expect(result.description).toBeNull();
    expect(result.name).toEqual('Original Project'); // Should remain unchanged
    expect(result.coding_language).toEqual('javascript'); // Should remain unchanged

    // Verify in database
    const dbProject = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .execute();

    expect(dbProject[0].description).toBeNull();
  });

  it('should update coding language only', async () => {
    const updateInput: UpdateProjectInput = {
      id: projectId,
      coding_language: 'python'
    };

    const result = await updateProject(updateInput);

    expect(result.coding_language).toEqual('python');
    expect(result.name).toEqual('Original Project'); // Should remain unchanged
    expect(result.description).toEqual('Original description'); // Should remain unchanged
  });

  it('should update multiple fields at once', async () => {
    const updateInput: UpdateProjectInput = {
      id: projectId,
      name: 'Multi-Updated Project',
      description: 'New description',
      coding_language: 'typescript'
    };

    const result = await updateProject(updateInput);

    expect(result.name).toEqual('Multi-Updated Project');
    expect(result.description).toEqual('New description');
    expect(result.coding_language).toEqual('typescript');
    expect(result.user_id).toEqual(userId);
    expect(result.id).toEqual(projectId);

    // Verify in database
    const dbProject = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .execute();

    expect(dbProject[0].name).toEqual('Multi-Updated Project');
    expect(dbProject[0].description).toEqual('New description');
    expect(dbProject[0].coding_language).toEqual('typescript');
  });

  it('should update the updated_at timestamp', async () => {
    // Get original timestamp
    const originalProject = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .execute();

    const originalUpdatedAt = originalProject[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateProjectInput = {
      id: projectId,
      name: 'Name for timestamp test'
    };

    const result = await updateProject(updateInput);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());

    // Verify in database
    const dbProject = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .execute();

    expect(dbProject[0].updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error for non-existent project', async () => {
    const updateInput: UpdateProjectInput = {
      id: 99999, // Non-existent project ID
      name: 'Should fail'
    };

    await expect(updateProject(updateInput)).rejects.toThrow(/Project with id 99999 not found/i);
  });

  it('should handle empty update (only update timestamp)', async () => {
    const updateInput: UpdateProjectInput = {
      id: projectId
      // No fields to update
    };

    const result = await updateProject(updateInput);

    // All original values should remain the same except updated_at
    expect(result.name).toEqual('Original Project');
    expect(result.description).toEqual('Original description');
    expect(result.coding_language).toEqual('javascript');
    expect(result.user_id).toEqual(userId);
    expect(result.id).toEqual(projectId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});