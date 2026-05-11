import { z } from "zod";

export const SideSchema = z.enum(["old", "new"]);
export const ReviewerStatusSchema = z.enum(["commented", "approved", "changes_requested"]);

export const CommentSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  body: z.string(),
  createdAt: z.string(),
});

export const ThreadAnchorSchema = z.object({
  side: SideSchema,
  line: z.number().int().nonnegative(),
});

export const ThreadSchema = z.object({
  id: z.string(),
  anchor: ThreadAnchorSchema,
  comments: z.array(CommentSchema),
  resolved: z.boolean(),
});

export const ReviewerSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: ReviewerStatusSchema,
});

// ---------- Client → Server ----------

export const ClientHelloSchema = z.object({
  type: z.literal("hello"),
  userId: z.string(),
});

export const ClientAddThreadSchema = z.object({
  type: z.literal("add_thread"),
  opId: z.string(),
  side: SideSchema,
  line: z.number().int().nonnegative(),
  body: z.string().min(1),
});

export const ClientAddReplySchema = z.object({
  type: z.literal("add_reply"),
  opId: z.string(),
  threadId: z.string(),
  body: z.string().min(1),
});

export const ClientResolveSchema = z.object({
  type: z.literal("resolve"),
  opId: z.string(),
  threadId: z.string(),
  resolved: z.boolean(),
});

export const ClientSetStatusSchema = z.object({
  type: z.literal("set_status"),
  opId: z.string(),
  status: ReviewerStatusSchema,
});

export const ClientMessageSchema = z.discriminatedUnion("type", [
  ClientHelloSchema,
  ClientAddThreadSchema,
  ClientAddReplySchema,
  ClientResolveSchema,
  ClientSetStatusSchema,
]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

// ---------- Server → Client ----------

export const ServerBootstrapSchema = z.object({
  type: z.literal("bootstrap"),
  reviewers: z.array(ReviewerSchema),
  threads: z.array(ThreadSchema),
});

export const ServerThreadAddedSchema = z.object({
  type: z.literal("thread_added"),
  opId: z.string().optional(),
  thread: ThreadSchema,
});

export const ServerReplyAddedSchema = z.object({
  type: z.literal("reply_added"),
  opId: z.string().optional(),
  threadId: z.string(),
  comment: CommentSchema,
});

export const ServerResolveChangedSchema = z.object({
  type: z.literal("resolve_changed"),
  opId: z.string().optional(),
  threadId: z.string(),
  resolved: z.boolean(),
});

export const ServerStatusChangedSchema = z.object({
  type: z.literal("status_changed"),
  opId: z.string().optional(),
  userId: z.string(),
  status: ReviewerStatusSchema,
});

export const ServerRejectSchema = z.object({
  type: z.literal("reject"),
  opId: z.string(),
  reason: z.string(),
});

export const ServerMessageSchema = z.discriminatedUnion("type", [
  ServerBootstrapSchema,
  ServerThreadAddedSchema,
  ServerReplyAddedSchema,
  ServerResolveChangedSchema,
  ServerStatusChangedSchema,
  ServerRejectSchema,
]);
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
