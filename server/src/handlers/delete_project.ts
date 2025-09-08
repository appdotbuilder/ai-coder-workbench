import { db } from '../db';
import { projectsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Handler for deleting a project and all associated data.
 * Cascades to delete all conversations, messages, and code snippets.
 * Validates user ownership before deletion.
 */
export const deleteProject = async (projectId: number, userId: number): Promise<boolean> => {
  try {
    // Delete the project with ownership validation
    // The cascade deletes are handled by the database foreign key constraints
    const result = await db.delete(projectsTable)
      .where(and(
        eq(projectsTable.id, projectId),
        eq(projectsTable.user_id, userId)
      ))
      .execute();

    // Check if any rows were affected (i.e., project existed and was owned by user)
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Project deletion failed:', error);
    throw error;
  }
};