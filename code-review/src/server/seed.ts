import type { Reviewer, Thread } from "../shared/types.js";

export const SEED_LANGUAGE = "typescript";

// Fabricated LruCache.ts diff. ~60 lines including hunk header + context + add/del.
export const SEED_DIFF_TEXT = `@@ -1,60 +1,62 @@
 export interface LruCacheOptions {
   readonly capacity: number;
-  readonly onEvict?: (key: string, value: unknown) => void;
+  readonly onEvict?: (key: string, value: unknown) => void;
+  readonly trackHits?: boolean;
 }

 export class LruCache<V> {
   private readonly capacity: number;
   private readonly onEvict?: (key: string, value: V) => void;
+  private readonly trackHits: boolean;
   private readonly map = new Map<string, V>();
+  private hits = 0;
+  private misses = 0;

   constructor(options: LruCacheOptions) {
-    if (options.capacity <= 0) {
-      throw new Error("capacity must be positive");
+    if (!Number.isInteger(options.capacity) || options.capacity <= 0) {
+      throw new Error("capacity must be a positive integer");
     }
     this.capacity = options.capacity;
     this.onEvict = options.onEvict as ((k: string, v: V) => void) | undefined;
+    this.trackHits = options.trackHits ?? false;
   }

   get(key: string): V | undefined {
     const value = this.map.get(key);
     if (value === undefined) {
+      if (this.trackHits) this.misses++;
       return undefined;
     }
-    // bump to most-recently-used
+    if (this.trackHits) this.hits++;
+    // bump to most-recently-used by re-inserting
     this.map.delete(key);
     this.map.set(key, value);
     return value;
   }

   set(key: string, value: V): void {
     if (this.map.has(key)) {
       this.map.delete(key);
     } else if (this.map.size >= this.capacity) {
       const oldestKey = this.map.keys().next().value;
       if (oldestKey !== undefined) {
         const oldestValue = this.map.get(oldestKey);
         this.map.delete(oldestKey);
-        this.onEvict?.(oldestKey, oldestValue as V);
+        if (oldestValue !== undefined) {
+          this.onEvict?.(oldestKey, oldestValue);
+        }
       }
     }
     this.map.set(key, value);
   }

   delete(key: string): boolean {
     return this.map.delete(key);
   }

+  stats(): { hits: number; misses: number; size: number } {
+    return { hits: this.hits, misses: this.misses, size: this.map.size };
+  }
+
   clear(): void {
     this.map.clear();
+    this.hits = 0;
+    this.misses = 0;
   }

   get size(): number {
     return this.map.size;
   }
 }
`;

export const SEED_REVIEWERS: Reviewer[] = [
  { id: "alice", name: "Alice", status: "commented" },
  { id: "bob", name: "Bob", status: "approved" },
];

const nowIso = (offsetMin: number): string =>
  new Date(Date.now() - offsetMin * 60_000).toISOString();

export const SEED_THREADS: Thread[] = [
  {
    id: "t-seed-1",
    anchor: { side: "new", line: 4 },
    resolved: false,
    comments: [
      {
        id: "c-seed-1",
        authorId: "alice",
        authorName: "Alice",
        body: "Should `trackHits` default to true so existing dashboards keep working?",
        createdAt: nowIso(35),
      },
    ],
  },
  {
    id: "t-seed-2",
    anchor: { side: "new", line: 27 },
    resolved: false,
    comments: [
      {
        id: "c-seed-2",
        authorId: "bob",
        authorName: "Bob",
        body: "Nice — bumping the recency on hit was the whole bug.",
        createdAt: nowIso(20),
      },
      {
        id: "c-seed-3",
        authorId: "alice",
        authorName: "Alice",
        body: "Agreed. Worth adding a unit test that hammers `get` to confirm ordering.",
        createdAt: nowIso(12),
      },
    ],
  },
  {
    id: "t-seed-3",
    anchor: { side: "new", line: 48 },
    resolved: true,
    comments: [
      {
        id: "c-seed-4",
        authorId: "alice",
        authorName: "Alice",
        body: "Guard against undefined eviction value? Map.get could be undefined in theory.",
        createdAt: nowIso(60),
      },
      {
        id: "c-seed-5",
        authorId: "bob",
        authorName: "Bob",
        body: "Done — wrapped in an `!== undefined` check.",
        createdAt: nowIso(40),
      },
    ],
  },
];
