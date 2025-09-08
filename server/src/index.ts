import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  updateUserInputSchema,
  authInputSchema,
  createProjectInputSchema,
  updateProjectInputSchema,
  getUserProjectsInputSchema,
  createConversationInputSchema,
  updateConversationInputSchema,
  getProjectConversationsInputSchema,
  createMessageInputSchema,
  getConversationMessagesInputSchema,
  createCodeSnippetInputSchema,
  updateCodeSnippetInputSchema,
  getConversationCodeSnippetsInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { updateUser } from './handlers/update_user';
import { getUserByAuth } from './handlers/get_user_by_auth';
import { getUserById } from './handlers/get_user_by_id';
import { createProject } from './handlers/create_project';
import { updateProject } from './handlers/update_project';
import { getUserProjects } from './handlers/get_user_projects';
import { deleteProject } from './handlers/delete_project';
import { createConversation } from './handlers/create_conversation';
import { updateConversation } from './handlers/update_conversation';
import { getProjectConversations } from './handlers/get_project_conversations';
import { createMessage } from './handlers/create_message';
import { getConversationMessages } from './handlers/get_conversation_messages';
import { createCodeSnippet } from './handlers/create_code_snippet';
import { updateCodeSnippet } from './handlers/update_code_snippet';
import { getConversationCodeSnippets } from './handlers/get_conversation_code_snippets';
import { deleteCodeSnippet } from './handlers/delete_code_snippet';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User authentication and management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),
  
  getUserByAuth: publicProcedure
    .input(authInputSchema)
    .query(({ input }) => getUserByAuth(input)),
  
  getUserById: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserById(input.userId)),

  // Project management
  createProject: publicProcedure
    .input(createProjectInputSchema)
    .mutation(({ input }) => createProject(input)),
  
  updateProject: publicProcedure
    .input(updateProjectInputSchema)
    .mutation(({ input }) => updateProject(input)),
  
  getUserProjects: publicProcedure
    .input(getUserProjectsInputSchema)
    .query(({ input }) => getUserProjects(input)),
  
  deleteProject: publicProcedure
    .input(z.object({ projectId: z.number(), userId: z.number() }))
    .mutation(({ input }) => deleteProject(input.projectId, input.userId)),

  // Conversation management
  createConversation: publicProcedure
    .input(createConversationInputSchema)
    .mutation(({ input }) => createConversation(input)),
  
  updateConversation: publicProcedure
    .input(updateConversationInputSchema)
    .mutation(({ input }) => updateConversation(input)),
  
  getProjectConversations: publicProcedure
    .input(getProjectConversationsInputSchema)
    .query(({ input }) => getProjectConversations(input)),

  // Message management
  createMessage: publicProcedure
    .input(createMessageInputSchema)
    .mutation(({ input }) => createMessage(input)),
  
  getConversationMessages: publicProcedure
    .input(getConversationMessagesInputSchema)
    .query(({ input }) => getConversationMessages(input)),

  // Code snippet management
  createCodeSnippet: publicProcedure
    .input(createCodeSnippetInputSchema)
    .mutation(({ input }) => createCodeSnippet(input)),
  
  updateCodeSnippet: publicProcedure
    .input(updateCodeSnippetInputSchema)
    .mutation(({ input }) => updateCodeSnippet(input)),
  
  getConversationCodeSnippets: publicProcedure
    .input(getConversationCodeSnippetsInputSchema)
    .query(({ input }) => getConversationCodeSnippets(input)),
  
  deleteCodeSnippet: publicProcedure
    .input(z.object({ snippetId: z.number(), userId: z.number() }))
    .mutation(({ input }) => deleteCodeSnippet(input.snippetId, input.userId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();