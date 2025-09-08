import { db } from '../db';
import { codeSnippetsTable } from '../db/schema';
import { type GetConversationCodeSnippetsInput, type CodeSnippet } from '../schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Handler for retrieving all code snippets associated with a conversation.
 * Returns snippets ordered by most recently created first.
 * Used for displaying saved code snippets in the editor component.
 */
export const getConversationCodeSnippets = async (input: GetConversationCodeSnippetsInput): Promise<CodeSnippet[]> => {
  try {
    const results = await db.select()
      .from(codeSnippetsTable)
      .where(eq(codeSnippetsTable.conversation_id, input.conversation_id))
      .orderBy(desc(codeSnippetsTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to retrieve code snippets for conversation:', error);
    throw error;
  }
};