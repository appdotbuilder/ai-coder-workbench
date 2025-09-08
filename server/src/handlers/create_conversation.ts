import { db } from '../db';
import { conversationsTable, projectsTable, usersTable } from '../db/schema';
import { type CreateConversationInput, type Conversation } from '../schema';
import { eq, and } from 'drizzle-orm';

/**
 * Handler for creating a new AI conversation within a project.
 * Each conversation represents a chat session with a specific AI model.
 * Associates the conversation with both the project and user for proper access control.
 */
export async function createConversation(input: CreateConversationInput): Promise<Conversation> {
  try {
    // Validate that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Validate that the project exists and belongs to the user
    const project = await db.select()
      .from(projectsTable)
      .where(and(
        eq(projectsTable.id, input.project_id),
        eq(projectsTable.user_id, input.user_id)
      ))
      .execute();

    if (project.length === 0) {
      throw new Error(`Project with id ${input.project_id} not found or does not belong to user ${input.user_id}`);
    }

    // Create the conversation
    const result = await db.insert(conversationsTable)
      .values({
        project_id: input.project_id,
        user_id: input.user_id,
        title: input.title,
        ai_model: input.ai_model
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Conversation creation failed:', error);
    throw error;
  }
}