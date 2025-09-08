import { db } from '../db';
import { messagesTable, conversationsTable } from '../db/schema';
import { type CreateMessageInput, type Message } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Handler for creating a new message in a conversation.
 * Handles both user messages and AI assistant responses.
 * Stores metadata for additional context like model parameters or error states.
 */
export async function createMessage(input: CreateMessageInput): Promise<Message> {
  try {
    // Validate that the conversation exists
    const conversation = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, input.conversation_id))
      .execute();

    if (conversation.length === 0) {
      throw new Error(`Conversation with id ${input.conversation_id} not found`);
    }

    // Insert the message
    const result = await db.insert(messagesTable)
      .values({
        conversation_id: input.conversation_id,
        role: input.role,
        content: input.content,
        metadata: input.metadata || null
      })
      .returning()
      .execute();

    const message = result[0];
    return {
      ...message,
      metadata: message.metadata as Record<string, any> | null
    };
  } catch (error) {
    console.error('Message creation failed:', error);
    throw error;
  }
}