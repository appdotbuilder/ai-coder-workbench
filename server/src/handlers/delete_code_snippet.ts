import { db } from '../db';
import { codeSnippetsTable, conversationsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Handler for deleting a code snippet.
 * Validates user ownership through conversation access before deletion.
 * Returns success status of the deletion operation.
 */
export const deleteCodeSnippet = async (snippetId: number, userId: number): Promise<boolean> => {
  try {
    // First, verify that the user has access to this code snippet through conversation ownership
    const snippetWithConversation = await db
      .select({
        snippet_id: codeSnippetsTable.id,
        user_id: conversationsTable.user_id
      })
      .from(codeSnippetsTable)
      .innerJoin(conversationsTable, eq(codeSnippetsTable.conversation_id, conversationsTable.id))
      .where(eq(codeSnippetsTable.id, snippetId))
      .execute();

    // Check if snippet exists and user has access
    if (snippetWithConversation.length === 0) {
      return false; // Snippet not found
    }

    if (snippetWithConversation[0].user_id !== userId) {
      return false; // User doesn't have access to this snippet
    }

    // Delete the code snippet
    const result = await db
      .delete(codeSnippetsTable)
      .where(eq(codeSnippetsTable.id, snippetId))
      .execute();

    // Return true if deletion was successful
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Code snippet deletion failed:', error);
    throw error;
  }
};