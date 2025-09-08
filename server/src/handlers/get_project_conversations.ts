import { db } from '../db';
import { conversationsTable } from '../db/schema';
import { type GetProjectConversationsInput, type Conversation } from '../schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Handler for retrieving all conversations within a specific project.
 * Returns conversations ordered by most recently updated first.
 * Used for displaying the conversation history in the project view.
 */
export async function getProjectConversations(input: GetProjectConversationsInput): Promise<Conversation[]> {
  try {
    // Query conversations for the specified project, ordered by most recent updates
    const results = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.project_id, input.project_id))
      .orderBy(desc(conversationsTable.updated_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get project conversations:', error);
    throw error;
  }
}