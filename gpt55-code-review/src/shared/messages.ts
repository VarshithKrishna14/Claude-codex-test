import { z } from "zod";

export const SideSchema = z.enum(["old", "new"]);
export const ReviewerStatusSchema = z.enum(["commented", "approved", "changes_requested"]);

export const ReviewerSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: ReviewerStatusSchema,
});

export const CommentSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  body: z.string(),
  createdAt: z.string(),
});

export const ThreadSchema = z.object({
  id: z.string(),
  anchor: z.object({
    side: SideSchema,
    line: z.number().int().positive(),
  }),
  comments: z.array(CommentSchema).readonly(),
  resolved: z.boolean(),
});

export const ClientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hello"), reviewerId: z.string() }),
  z.object({
    type: z.literal("addThread"),
    opId: z.string(),
    side: SideSchema,
    line: z.number().int().positive(),
    body: z.string().min(1),
  }),
  z.object({
    type: z.literal("addReply"),
    opId: z.string(),
    threadId: z.string(),
    body: z.string().min(1),
  }),
  z.object({
    type: z.literal("setResolved"),
    opId: z.string(),
    threadId: z.string(),
    resolved: z.boolean(),
  }),
  z.object({
    type: z.literal("setReviewerStatus"),
    opId: z.string(),
    status: ReviewerStatusSchema,
  }),
]);

export const ServerMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("bootstrap"), reviewers: z.array(ReviewerSchema), threads: z.array(ThreadSchema) }),
  z.object({ type: z.literal("threadAdded"), opId: z.string().optional(), thread: ThreadSchema }),
  z.object({
    type: z.literal("replyAdded"),
    opId: z.string().optional(),
    threadId: z.string(),
    comment: CommentSchema,
  }),
  z.object({
    type: z.literal("threadResolved"),
    opId: z.string().optional(),
    threadId: z.string(),
    resolved: z.boolean(),
  }),
  z.object({
    type: z.literal("reviewerStatusChanged"),
    opId: z.string().optional(),
    reviewerId: z.string(),
    status: ReviewerStatusSchema,
  }),
  z.object({ type: z.literal("reject"), opId: z.string(), reason: z.string() }),
]);

export type ClientMessage = z.infer<typeof ClientMessageSchema>;
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
