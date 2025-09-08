import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable } from '../db/schema';
import { type GetUserProjectsInput, type CreateUserInput, type CreateProjectInput } from '../schema';
import { getUserProjects } from '../handlers/get_user_projects';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User',
  auth_provider: 'email',
  auth_provider_id: 'test123',
  preferred_coding_language: 'typescript',
  preferred_ai_model: 'claude-sonnet'
};

const testProject1: Omit<CreateProjectInput, 'user_id'> = {
  name: 'First Project',
  description: 'My first coding project',
  coding_language: 'typescript'
};

const testProject2: Omit<CreateProjectInput, 'user_id'> = {
  name: 'Second Project',
  description: 'Another project',
  coding_language: 'python'
};

const testProject3: Omit<CreateProjectInput, 'user_id'> = {
  name: 'Third Project',
  description: null,
  coding_language: 'javascript'
};

describe('getUserProjects', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no projects', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user = userResult[0];

    const input: GetUserProjectsInput = { user_id: user.id };
    const result = await getUserProjects(input);

    expect(result).toEqual([]);
  });

  it('should return projects for a user ordered by updated_at desc', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user = userResult[0];

    // Create multiple projects with different timestamps
    const project1Result = await db.insert(projectsTable)
      .values({
        ...testProject1,
        user_id: user.id
      })
      .returning()
      .execute();

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const project2Result = await db.insert(projectsTable)
      .values({
        ...testProject2,
        user_id: user.id
      })
      .returning()
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    const project3Result = await db.insert(projectsTable)
      .values({
        ...testProject3,
        user_id: user.id
      })
      .returning()
      .execute();

    const input: GetUserProjectsInput = { user_id: user.id };
    const result = await getUserProjects(input);

    expect(result).toHaveLength(3);
    
    // Should be ordered by updated_at desc (newest first)
    expect(result[0].id).toEqual(project3Result[0].id);
    expect(result[1].id).toEqual(project2Result[0].id);
    expect(result[2].id).toEqual(project1Result[0].id);

    // Verify project data integrity
    expect(result[0].name).toEqual('Third Project');
    expect(result[0].description).toBeNull();
    expect(result[0].coding_language).toEqual('javascript');
    expect(result[0].user_id).toEqual(user.id);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should only return projects for the specified user', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'user2@example.com',
        auth_provider_id: 'test456'
      })
      .returning()
      .execute();

    const user1 = user1Result[0];
    const user2 = user2Result[0];

    // Create projects for both users
    await db.insert(projectsTable)
      .values({
        ...testProject1,
        user_id: user1.id
      })
      .execute();

    await db.insert(projectsTable)
      .values({
        ...testProject2,
        user_id: user1.id
      })
      .execute();

    await db.insert(projectsTable)
      .values({
        ...testProject3,
        user_id: user2.id
      })
      .execute();

    // Get projects for user1
    const input1: GetUserProjectsInput = { user_id: user1.id };
    const result1 = await getUserProjects(input1);

    expect(result1).toHaveLength(2);
    result1.forEach(project => {
      expect(project.user_id).toEqual(user1.id);
    });

    // Get projects for user2
    const input2: GetUserProjectsInput = { user_id: user2.id };
    const result2 = await getUserProjects(input2);

    expect(result2).toHaveLength(1);
    expect(result2[0].user_id).toEqual(user2.id);
    expect(result2[0].name).toEqual('Third Project');
  });

  it('should return empty array for non-existent user', async () => {
    const input: GetUserProjectsInput = { user_id: 99999 };
    const result = await getUserProjects(input);

    expect(result).toEqual([]);
  });

  it('should handle projects with all field variations', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user = userResult[0];

    // Create project with all fields populated
    const projectWithDescription = await db.insert(projectsTable)
      .values({
        name: 'Full Project',
        description: 'Complete project description',
        coding_language: 'rust',
        user_id: user.id
      })
      .returning()
      .execute();

    // Create project with null description
    const projectWithoutDescription = await db.insert(projectsTable)
      .values({
        name: 'Minimal Project',
        description: null,
        coding_language: 'go',
        user_id: user.id
      })
      .returning()
      .execute();

    const input: GetUserProjectsInput = { user_id: user.id };
    const result = await getUserProjects(input);

    expect(result).toHaveLength(2);
    
    const fullProject = result.find(p => p.name === 'Full Project');
    const minimalProject = result.find(p => p.name === 'Minimal Project');

    expect(fullProject).toBeDefined();
    expect(fullProject?.description).toEqual('Complete project description');
    expect(fullProject?.coding_language).toEqual('rust');

    expect(minimalProject).toBeDefined();
    expect(minimalProject?.description).toBeNull();
    expect(minimalProject?.coding_language).toEqual('go');
  });

  it('should maintain correct timestamp ordering across multiple operations', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user = userResult[0];

    // Create first project
    const firstProject = await db.insert(projectsTable)
      .values({
        ...testProject1,
        user_id: user.id
      })
      .returning()
      .execute();

    // Wait and create second project
    await new Promise(resolve => setTimeout(resolve, 20));

    const secondProject = await db.insert(projectsTable)
      .values({
        ...testProject2,
        user_id: user.id
      })
      .returning()
      .execute();

    // Update first project (should move it to the front)
    await new Promise(resolve => setTimeout(resolve, 20));
    
    await db.update(projectsTable)
      .set({ 
        name: 'Updated First Project',
        updated_at: new Date()
      })
      .where(eq(projectsTable.id, firstProject[0].id))
      .execute();

    const input: GetUserProjectsInput = { user_id: user.id };
    const result = await getUserProjects(input);

    expect(result).toHaveLength(2);
    
    // The updated project should be first due to newer updated_at timestamp
    expect(result[0].id).toEqual(firstProject[0].id);
    expect(result[0].name).toEqual('Updated First Project');
    expect(result[1].id).toEqual(secondProject[0].id);

    // Verify timestamp ordering
    expect(result[0].updated_at.getTime()).toBeGreaterThan(result[1].updated_at.getTime());
  });
});