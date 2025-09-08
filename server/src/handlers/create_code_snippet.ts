import { db } from '../db';
import { codeSnippetsTable, conversationsTable, messagesTable } from '../db/schema';
import { type CreateCodeSnippetInput, type CodeSnippet } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Handler for creating a new code snippet.
 * Code snippets can be extracted from AI responses or manually added by users.
 * Associates with conversations and optionally with specific messages.
 */
export async function createCodeSnippet(input: CreateCodeSnippetInput): Promise<CodeSnippet> {
  try {
    // Validate conversation exists
    const conversation = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, input.conversation_id))
      .execute();

    if (conversation.length === 0) {
      throw new Error(`Conversation with id ${input.conversation_id} not found`);
    }

    // If message_id is provided, validate it exists and belongs to the conversation
    if (input.message_id) {
      const message = await db.select()
        .from(messagesTable)
        .where(eq(messagesTable.id, input.message_id))
        .execute();

      if (message.length === 0) {
        throw new Error(`Message with id ${input.message_id} not found`);
      }

      if (message[0].conversation_id !== input.conversation_id) {
        throw new Error(`Message ${input.message_id} does not belong to conversation ${input.conversation_id}`);
      }
    }

    // Insert code snippet record
    const result = await db.insert(codeSnippetsTable)
      .values({
        conversation_id: input.conversation_id,
        message_id: input.message_id || null,
        title: input.title,
        code: input.code,
        language: input.language,
        description: input.description || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Code snippet creation failed:', error);
    throw error;
  }
}