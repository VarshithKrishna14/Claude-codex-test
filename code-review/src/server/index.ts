import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import {
  ClientMessageSchema,
  type ServerMessage,
} from "../shared/messages.js";
import { ReviewState } from "./state.js";
import { SEED_DIFF_TEXT, SEED_LANGUAGE } from "./seed.js";

const PORT = Number.parseInt(process.env.PORT ?? "8787", 10);
const state = new ReviewState();

interface Client {
  readonly socket: WebSocket;
  userId: string | null;
}
const clients = new Set<Client>();

function send(client: Client, msg: ServerMessage): void {
  if (client.socket.readyState === client.socket.OPEN) {
    client.socket.send(JSON.stringify(msg));
  }
}

function broadcast(msg: ServerMessage, originator?: Client): void {
  for (const c of clients) {
    if (c === originator) continue;
    send(c, msg);
  }
}

function reply(client: Client, msg: ServerMessage): void {
  send(client, msg);
}

const httpServer = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/api/diff") {
    res.writeHead(200, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    res.end(JSON.stringify({ diff: SEED_DIFF_TEXT, language: SEED_LANGUAGE }));
    return;
  }
  if (req.method === "GET" && req.url === "/api/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.writeHead(404).end();
});

const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

wss.on("connection", (socket) => {
  const client: Client = { socket, userId: null };
  clients.add(client);

  socket.on("message", (raw) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString("utf8"));
    } catch {
      return;
    }
    const result = ClientMessageSchema.safeParse(parsed);
    if (!result.success) return;
    const msg = result.data;

    switch (msg.type) {
      case "hello": {
        client.userId = msg.userId;
        state.ensureReviewer(msg.userId);
        const snap = state.snapshot();
        reply(client, { type: "bootstrap", reviewers: snap.reviewers, threads: snap.threads });
        return;
      }
      case "add_thread": {
        if (!client.userId) {
          reply(client, { type: "reject", opId: msg.opId, reason: "not_identified" });
          return;
        }
        const thread = state.addThread({
          authorId: client.userId,
          side: msg.side,
          line: msg.line,
          body: msg.body,
        });
        reply(client, { type: "thread_added", opId: msg.opId, thread });
        broadcast({ type: "thread_added", thread }, client);
        return;
      }
      case "add_reply": {
        if (!client.userId) {
          reply(client, { type: "reject", opId: msg.opId, reason: "not_identified" });
          return;
        }
        const out = state.addReply({
          authorId: client.userId,
          threadId: msg.threadId,
          body: msg.body,
        });
        if (!out) {
          reply(client, { type: "reject", opId: msg.opId, reason: "thread_not_found" });
          return;
        }
        reply(client, {
          type: "reply_added",
          opId: msg.opId,
          threadId: out.thread.id,
          comment: out.comment,
        });
        broadcast({ type: "reply_added", threadId: out.thread.id, comment: out.comment }, client);
        return;
      }
      case "resolve": {
        const updated = state.setResolved(msg.threadId, msg.resolved);
        if (!updated) {
          reply(client, { type: "reject", opId: msg.opId, reason: "thread_not_found" });
          return;
        }
        reply(client, {
          type: "resolve_changed",
          opId: msg.opId,
          threadId: updated.id,
          resolved: updated.resolved,
        });
        broadcast(
          { type: "resolve_changed", threadId: updated.id, resolved: updated.resolved },
          client,
        );
        return;
      }
      case "set_status": {
        if (!client.userId) {
          reply(client, { type: "reject", opId: msg.opId, reason: "not_identified" });
          return;
        }
        const reviewer = state.setStatus(client.userId, msg.status);
        reply(client, {
          type: "status_changed",
          opId: msg.opId,
          userId: reviewer.id,
          status: reviewer.status,
        });
        broadcast(
          { type: "status_changed", userId: reviewer.id, status: reviewer.status },
          client,
        );
        return;
      }
    }
  });

  socket.on("close", () => clients.delete(client));
  socket.on("error", () => clients.delete(client));
});

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT} (ws: /ws)`);
});
