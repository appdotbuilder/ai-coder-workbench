import { db } from '../db';
import { projectsTable } from '../db/schema';
import { type GetUserProjectsInput, type Project } from '../schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Handler for retrieving all projects belonging to a specific user.
 * Returns projects ordered by most recently updated first.
 * Used for displaying the user's project list in the UI.
 */
export async function getUserProjects(input: GetUserProjectsInput): Promise<Project[]> {
  try {
    const results = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.user_id, input.user_id))
      .orderBy(desc(projectsTable.updated_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get user projects:', error);
    throw error;
  }
}