import { db } from '../db';
import { projectsTable, usersTable } from '../db/schema';
import { type CreateProjectInput, type Project } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Handler for creating a new project for a user.
 * Projects organize conversations and code snippets by coding language and topic.
 * Associates the project with the authenticated user and sets initial metadata.
 */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  try {
    // Validate that the user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .limit(1)
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with ID ${input.user_id} does not exist`);
    }

    // Insert project record
    const result = await db.insert(projectsTable)
      .values({
        user_id: input.user_id,
        name: input.name,
        description: input.description || null,
        coding_language: input.coding_language
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Project creation failed:', error);
    throw error;
  }
}