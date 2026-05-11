import type { Reviewer, Thread } from "../shared/types.js";

export const reviewers: readonly Reviewer[] = [
  { id: "alice", name: "Alice", status: "commented" },
  { id: "bob", name: "Bob", status: "approved" },
];

export const sampleDiff = `@@ -1,56 +1,61 @@
 export interface CacheOptions {
   capacity: number;
   ttlMs?: number;
-  onEvict?: (key: string) => void;
+  onEvict?: (key: string, reason: string) => void;
+  trackHits?: boolean;
 }
 
 export class TinyCache<T> {
   private readonly capacity: number;
   private readonly ttlMs: number | null;
-  private readonly onEvict?: (key: string) => void;
+  private readonly onEvict?: (key: string, reason: string) => void;
+  private readonly trackHits: boolean;
   private readonly values = new Map<string, { value: T; expiresAt: number | null }>();
+  private readonly hits = new Map<string, number>();
 
   constructor(options: CacheOptions) {
     if (!Number.isInteger(options.capacity) || options.capacity <= 0) {
       throw new Error("capacity must be positive");
     }
     this.capacity = options.capacity;
     this.ttlMs = options.ttlMs ?? null;
     this.onEvict = options.onEvict;
+    this.trackHits = options.trackHits ?? false;
   }
 
   get(key: string): T | undefined {
     const entry = this.values.get(key);
     if (!entry) return undefined;
     if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
-      this.values.delete(key);
-      this.onEvict?.(key);
+      this.delete(key, "expired");
       return undefined;
     }
+    if (this.trackHits) this.hits.set(key, (this.hits.get(key) ?? 0) + 1);
     this.values.delete(key);
     this.values.set(key, entry);
     return entry.value;
   }
 
   set(key: string, value: T): void {
     if (this.values.has(key)) {
       this.values.delete(key);
     }
     while (this.values.size >= this.capacity) {
       const oldest = this.values.keys().next().value;
       if (typeof oldest !== "string") break;
-      this.values.delete(oldest);
-      this.onEvict?.(oldest);
+      this.delete(oldest, "capacity");
     }
     const expiresAt = this.ttlMs === null ? null : Date.now() + this.ttlMs;
     this.values.set(key, { value, expiresAt });
   }
 
   has(key: string): boolean {
     return this.get(key) !== undefined;
   }
 
+  hitCount(key: string): number {
+    return this.hits.get(key) ?? 0;
+  }
+
   delete(key: string): boolean {
+    return this.delete(key, "manual");
+  }
+
+  private delete(key: string, reason: string): boolean {
     const existed = this.values.delete(key);
-    if (existed) this.onEvict?.(key);
+    this.hits.delete(key);
+    if (existed) this.onEvict?.(key, reason);
     return existed;
   }
 }`;

export const threads: readonly Thread[] = [
  {
    id: "thread-1",
    anchor: { side: "new", line: 4 },
    resolved: false,
    comments: [
      {
        id: "comment-1",
        authorId: "alice",
        authorName: "Alice",
        body: "The eviction callback now includes a reason. Nice API improvement.",
        createdAt: new Date(Date.now() - 900_000).toISOString(),
      },
    ],
  },
  {
    id: "thread-2",
    anchor: { side: "old", line: 20 },
    resolved: true,
    comments: [
      {
        id: "comment-2",
        authorId: "bob",
        authorName: "Bob",
        body: "Resolved: expiry now routes through the shared delete path.",
        createdAt: new Date(Date.now() - 500_000).toISOString(),
      },
    ],
  },
  {
    id: "thread-3",
    anchor: { side: "new", line: 42 },
    resolved: false,
    comments: [
      {
        id: "comment-3",
        authorId: "bob",
        authorName: "Bob",
        body: "Please add a unit test around hitCount after manual deletion.",
        createdAt: new Date(Date.now() - 180_000).toISOString(),
      },
    ],
  },
];
