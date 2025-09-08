import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  integer,
  pgEnum,
  json,
  index,
  foreignKey
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums for PostgreSQL
export const authProviderEnum = pgEnum('auth_provider', ['google', 'facebook', 'email']);
export const codingLanguageEnum = pgEnum('coding_language', [
  'javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 
  'go', 'rust', 'php', 'ruby', 'kotlin', 'swift', 'other'
]);
export const aiModelEnum = pgEnum('ai_model', ['claude-sonnet', 'gemini-2.5-flash', 'gpt-4']);
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatar_url: text('avatar_url'), // Nullable
  auth_provider: authProviderEnum('auth_provider').notNull(),
  auth_provider_id: text('auth_provider_id').notNull(),
  preferred_coding_language: codingLanguageEnum('preferred_coding_language').notNull(),
  preferred_ai_model: aiModelEnum('preferred_ai_model').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  authProviderIdx: index('users_auth_provider_idx').on(table.auth_provider, table.auth_provider_id),
}));

// Projects table
export const projectsTable = pgTable('projects', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'), // Nullable
  coding_language: codingLanguageEnum('coding_language').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('projects_user_id_idx').on(table.user_id),
  userProjectFk: foreignKey({
    columns: [table.user_id],
    foreignColumns: [usersTable.id],
    name: 'projects_user_id_fk'
  }).onDelete('cascade')
}));

// Conversations table
export const conversationsTable = pgTable('conversations', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull(),
  user_id: integer('user_id').notNull(),
  title: text('title').notNull(),
  ai_model: aiModelEnum('ai_model').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index('conversations_project_id_idx').on(table.project_id),
  userIdIdx: index('conversations_user_id_idx').on(table.user_id),
  projectConversationFk: foreignKey({
    columns: [table.project_id],
    foreignColumns: [projectsTable.id],
    name: 'conversations_project_id_fk'
  }).onDelete('cascade'),
  userConversationFk: foreignKey({
    columns: [table.user_id],
    foreignColumns: [usersTable.id],
    name: 'conversations_user_id_fk'
  }).onDelete('cascade')
}));

// Messages table
export const messagesTable = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversation_id: integer('conversation_id').notNull(),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  metadata: json('metadata'), // Nullable JSON for additional data
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  conversationIdIdx: index('messages_conversation_id_idx').on(table.conversation_id),
  createdAtIdx: index('messages_created_at_idx').on(table.created_at),
  conversationMessageFk: foreignKey({
    columns: [table.conversation_id],
    foreignColumns: [conversationsTable.id],
    name: 'messages_conversation_id_fk'
  }).onDelete('cascade')
}));

// Code snippets table
export const codeSnippetsTable = pgTable('code_snippets', {
  id: serial('id').primaryKey(),
  conversation_id: integer('conversation_id').notNull(),
  message_id: integer('message_id'), // Nullable, can be associated with a specific message
  title: text('title').notNull(),
  code: text('code').notNull(),
  language: codingLanguageEnum('language').notNull(),
  description: text('description'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  conversationIdIdx: index('code_snippets_conversation_id_idx').on(table.conversation_id),
  messageIdIdx: index('code_snippets_message_id_idx').on(table.message_id),
  conversationSnippetFk: foreignKey({
    columns: [table.conversation_id],
    foreignColumns: [conversationsTable.id],
    name: 'code_snippets_conversation_id_fk'
  }).onDelete('cascade'),
  messageSnippetFk: foreignKey({
    columns: [table.message_id],
    foreignColumns: [messagesTable.id],
    name: 'code_snippets_message_id_fk'
  }).onDelete('set null')
}));

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  projects: many(projectsTable),
  conversations: many(conversationsTable),
}));

export const projectsRelations = relations(projectsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [projectsTable.user_id],
    references: [usersTable.id],
  }),
  conversations: many(conversationsTable),
}));

export const conversationsRelations = relations(conversationsTable, ({ one, many }) => ({
  project: one(projectsTable, {
    fields: [conversationsTable.project_id],
    references: [projectsTable.id],
  }),
  user: one(usersTable, {
    fields: [conversationsTable.user_id],
    references: [usersTable.id],
  }),
  messages: many(messagesTable),
  codeSnippets: many(codeSnippetsTable),
}));

export const messagesRelations = relations(messagesTable, ({ one, many }) => ({
  conversation: one(conversationsTable, {
    fields: [messagesTable.conversation_id],
    references: [conversationsTable.id],
  }),
  codeSnippets: many(codeSnippetsTable),
}));

export const codeSnippetsRelations = relations(codeSnippetsTable, ({ one }) => ({
  conversation: one(conversationsTable, {
    fields: [codeSnippetsTable.conversation_id],
    references: [conversationsTable.id],
  }),
  message: one(messagesTable, {
    fields: [codeSnippetsTable.message_id],
    references: [messagesTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Project = typeof projectsTable.$inferSelect;
export type NewProject = typeof projectsTable.$inferInsert;

export type Conversation = typeof conversationsTable.$inferSelect;
export type NewConversation = typeof conversationsTable.$inferInsert;

export type Message = typeof messagesTable.$inferSelect;
export type NewMessage = typeof messagesTable.$inferInsert;

export type CodeSnippet = typeof codeSnippetsTable.$inferSelect;
export type NewCodeSnippet = typeof codeSnippetsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  projects: projectsTable,
  conversations: conversationsTable,
  messages: messagesTable,
  codeSnippets: codeSnippetsTable,
};