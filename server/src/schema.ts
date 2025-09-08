import { z } from 'zod';

// Enums for validation
export const authProviderEnum = z.enum(['google', 'facebook', 'email']);
export const codingLanguageEnum = z.enum([
  'javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 
  'go', 'rust', 'php', 'ruby', 'kotlin', 'swift', 'other'
]);
export const aiModelEnum = z.enum(['claude-sonnet', 'gemini-2.5-flash', 'gpt-4']);

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  avatar_url: z.string().nullable(),
  auth_provider: authProviderEnum,
  auth_provider_id: z.string(),
  preferred_coding_language: codingLanguageEnum,
  preferred_ai_model: aiModelEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Project schema
export const projectSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  coding_language: codingLanguageEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Project = z.infer<typeof projectSchema>;

// Chat conversation schema
export const conversationSchema = z.object({
  id: z.number(),
  project_id: z.number(),
  user_id: z.number(),
  title: z.string(),
  ai_model: aiModelEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Conversation = z.infer<typeof conversationSchema>;

// Message schema
export const messageSchema = z.object({
  id: z.number(),
  conversation_id: z.number(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  metadata: z.record(z.any()).nullable(), // JSON metadata for additional info
  created_at: z.coerce.date()
});

export type Message = z.infer<typeof messageSchema>;

// Code snippet schema
export const codeSnippetSchema = z.object({
  id: z.number(),
  conversation_id: z.number(),
  message_id: z.number().nullable(),
  title: z.string(),
  code: z.string(),
  language: codingLanguageEnum,
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type CodeSnippet = z.infer<typeof codeSnippetSchema>;

// Input schemas for creating/updating

// User registration/update input
export const createUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  avatar_url: z.string().url().nullable().optional(),
  auth_provider: authProviderEnum,
  auth_provider_id: z.string().min(1),
  preferred_coding_language: codingLanguageEnum,
  preferred_ai_model: aiModelEnum
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  avatar_url: z.string().url().nullable().optional(),
  preferred_coding_language: codingLanguageEnum.optional(),
  preferred_ai_model: aiModelEnum.optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Project input schemas
export const createProjectInputSchema = z.object({
  user_id: z.number(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  coding_language: codingLanguageEnum
});

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

export const updateProjectInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  coding_language: codingLanguageEnum.optional()
});

export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;

// Conversation input schemas
export const createConversationInputSchema = z.object({
  project_id: z.number(),
  user_id: z.number(),
  title: z.string().min(1),
  ai_model: aiModelEnum
});

export type CreateConversationInput = z.infer<typeof createConversationInputSchema>;

export const updateConversationInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  ai_model: aiModelEnum.optional()
});

export type UpdateConversationInput = z.infer<typeof updateConversationInputSchema>;

// Message input schemas
export const createMessageInputSchema = z.object({
  conversation_id: z.number(),
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
  metadata: z.record(z.any()).nullable().optional()
});

export type CreateMessageInput = z.infer<typeof createMessageInputSchema>;

// Code snippet input schemas
export const createCodeSnippetInputSchema = z.object({
  conversation_id: z.number(),
  message_id: z.number().nullable().optional(),
  title: z.string().min(1),
  code: z.string().min(1),
  language: codingLanguageEnum,
  description: z.string().nullable().optional()
});

export type CreateCodeSnippetInput = z.infer<typeof createCodeSnippetInputSchema>;

export const updateCodeSnippetInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  language: codingLanguageEnum.optional(),
  description: z.string().nullable().optional()
});

export type UpdateCodeSnippetInput = z.infer<typeof updateCodeSnippetInputSchema>;

// Authentication input schemas
export const authInputSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  auth_provider: authProviderEnum,
  auth_provider_id: z.string().min(1),
  name: z.string().min(1),
  avatar_url: z.string().url().nullable().optional()
});

export type AuthInput = z.infer<typeof authInputSchema>;

// Query input schemas
export const getUserProjectsInputSchema = z.object({
  user_id: z.number()
});

export type GetUserProjectsInput = z.infer<typeof getUserProjectsInputSchema>;

export const getProjectConversationsInputSchema = z.object({
  project_id: z.number()
});

export type GetProjectConversationsInput = z.infer<typeof getProjectConversationsInputSchema>;

export const getConversationMessagesInputSchema = z.object({
  conversation_id: z.number()
});

export type GetConversationMessagesInput = z.infer<typeof getConversationMessagesInputSchema>;

export const getConversationCodeSnippetsInputSchema = z.object({
  conversation_id: z.number()
});

export type GetConversationCodeSnippetsInput = z.infer<typeof getConversationCodeSnippetsInputSchema>;