import { db } from '../db';
import { messagesTable } from '../db/schema';
import { type GetConversationMessagesInput, type Message } from '../schema';
import { eq, asc } from 'drizzle-orm';

/**
 * Handler for retrieving all messages in a conversation.
 * Returns messages ordered chronologically for proper chat display.
 * Includes both user messages and AI responses with metadata.
 */
export async function getConversationMessages(input: GetConversationMessagesInput): Promise<Message[]> {
  try {
    // Query messages for the conversation, ordered chronologically
    const results = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.conversation_id, input.conversation_id))
      .orderBy(asc(messagesTable.created_at))
      .execute();

    // Return messages with proper metadata type casting
    return results.map(result => ({
      ...result,
      metadata: result.metadata as Record<string, any> | null
    }));
  } catch (error) {
    console.error('Get conversation messages failed:', error);
    throw error;
  }
}