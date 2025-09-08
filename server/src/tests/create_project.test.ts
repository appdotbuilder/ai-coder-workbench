import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { projectsTable, usersTable } from '../db/schema';
import { type CreateProjectInput, type CreateUserInput } from '../schema';
import { createProject } from '../handlers/create_project';
import { eq } from 'drizzle-orm';

describe('createProject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test user
  const createTestUser = async (): Promise<number> => {
    const userInput: CreateUserInput = {
      email: 'test@example.com',
      name: 'Test User',
      auth_provider: 'email',
      auth_provider_id: 'test123',
      preferred_coding_language: 'typescript',
      preferred_ai_model: 'claude-sonnet'
    };

    const result = await db.insert(usersTable)
      .values(userInput)
      .returning()
      .execute();

    return result[0].id;
  };

  const testInput: CreateProjectInput = {
    user_id: 1, // Will be updated with actual user ID in tests
    name: 'My Test Project',
    description: 'A project for testing purposes',
    coding_language: 'typescript'
  };

  it('should create a project with all fields', async () => {
    const userId = await createTestUser();
    const input = { ...testInput, user_id: userId };

    const result = await createProject(input);

    expect(result.name).toEqual('My Test Project');
    expect(result.description).toEqual('A project for testing purposes');
    expect(result.user_id).toEqual(userId);
    expect(result.coding_language).toEqual('typescript');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a project with null description', async () => {
    const userId = await createTestUser();
    const input: CreateProjectInput = {
      user_id: userId,
      name: 'Project Without Description',
      coding_language: 'python'
    };

    const result = await createProject(input);

    expect(result.name).toEqual('Project Without Description');
    expect(result.description).toBeNull();
    expect(result.user_id).toEqual(userId);
    expect(result.coding_language).toEqual('python');
    expect(result.id).toBeDefined();
  });

  it('should save project to database', async () => {
    const userId = await createTestUser();
    const input = { ...testInput, user_id: userId };

    const result = await createProject(input);

    const projects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, result.id))
      .execute();

    expect(projects).toHaveLength(1);
    expect(projects[0].name).toEqual('My Test Project');
    expect(projects[0].description).toEqual('A project for testing purposes');
    expect(projects[0].user_id).toEqual(userId);
    expect(projects[0].coding_language).toEqual('typescript');
    expect(projects[0].created_at).toBeInstanceOf(Date);
    expect(projects[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    const input = { ...testInput, user_id: 999999 }; // Non-existent user ID

    await expect(createProject(input)).rejects.toThrow(/User with ID 999999 does not exist/i);
  });

  it('should create multiple projects for same user', async () => {
    const userId = await createTestUser();

    const project1Input: CreateProjectInput = {
      user_id: userId,
      name: 'First Project',
      description: 'First project description',
      coding_language: 'javascript'
    };

    const project2Input: CreateProjectInput = {
      user_id: userId,
      name: 'Second Project', 
      coding_language: 'python'
    };

    const project1 = await createProject(project1Input);
    const project2 = await createProject(project2Input);

    expect(project1.id).not.toEqual(project2.id);
    expect(project1.user_id).toEqual(userId);
    expect(project2.user_id).toEqual(userId);
    expect(project1.name).toEqual('First Project');
    expect(project2.name).toEqual('Second Project');
    expect(project1.coding_language).toEqual('javascript');
    expect(project2.coding_language).toEqual('python');

    // Verify both projects exist in database
    const allProjects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.user_id, userId))
      .execute();

    expect(allProjects).toHaveLength(2);
  });

  it('should create projects with different coding languages', async () => {
    const userId = await createTestUser();

    const languages = ['javascript', 'typescript', 'python', 'java', 'cpp'] as const;

    for (const language of languages) {
      const input: CreateProjectInput = {
        user_id: userId,
        name: `${language} Project`,
        coding_language: language
      };

      const result = await createProject(input);
      expect(result.coding_language).toEqual(language);
      expect(result.name).toEqual(`${language} Project`);
    }

    const allProjects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.user_id, userId))
      .execute();

    expect(allProjects).toHaveLength(languages.length);
  });
});