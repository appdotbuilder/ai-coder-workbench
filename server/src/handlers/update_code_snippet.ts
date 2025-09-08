import { db } from '../db';
import { codeSnippetsTable } from '../db/schema';
import { type UpdateCodeSnippetInput, type CodeSnippet } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Handler for updating an existing code snippet.
 * Allows modification of title, code content, language, and description.
 * Updates the updated_at timestamp automatically.
 */
export const updateCodeSnippet = async (input: UpdateCodeSnippetInput): Promise<CodeSnippet> => {
  try {
    // Build the update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.code !== undefined) {
      updateData.code = input.code;
    }

    if (input.language !== undefined) {
      updateData.language = input.language;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    // Update the code snippet
    const result = await db.update(codeSnippetsTable)
      .set(updateData)
      .where(eq(codeSnippetsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Code snippet with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Code snippet update failed:', error);
    throw error;
  }
};