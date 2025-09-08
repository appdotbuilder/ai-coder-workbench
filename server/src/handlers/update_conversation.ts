import { db } from '../db';
import { conversationsTable } from '../db/schema';
import { type UpdateConversationInput, type Conversation } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Handler for updating conversation metadata.
 * Allows changing the conversation title and switching AI models.
 * Updates the updated_at timestamp automatically.
 */
export async function updateConversation(input: UpdateConversationInput): Promise<Conversation> {
  try {
    // Build update values object with only the fields that are provided
    const updateValues: any = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateValues.title = input.title;
    }

    if (input.ai_model !== undefined) {
      updateValues.ai_model = input.ai_model;
    }

    // Update the conversation and return the updated record
    const result = await db.update(conversationsTable)
      .set(updateValues)
      .where(eq(conversationsTable.id, input.id))
      .returning()
      .execute();

    // Check if conversation was found and updated
    if (result.length === 0) {
      throw new Error(`Conversation with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Conversation update failed:', error);
    throw error;
  }
}