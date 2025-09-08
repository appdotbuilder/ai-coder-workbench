import { type GetUserProjectsInput, type Project } from '../schema';

/**
 * Handler for retrieving all projects belonging to a specific user.
 * Returns projects ordered by most recently updated first.
 * Used for displaying the user's project list in the UI.
 */
export async function getUserProjects(input: GetUserProjectsInput): Promise<Project[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching all projects for a user from the database.
    // Should return projects ordered by updated_at desc.
    return Promise.resolve([]);
}