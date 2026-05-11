import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { ClientMessageSchema, type ServerMessage } from "../shared/messages.js";
import { sampleDiff } from "./seed.js";
import { ReviewState } from "./state.js";

const PORT = Number.parseInt(process.env.PORT ?? "8877", 10);
const state = new ReviewState();

interface Client {
  readonly socket: WebSocket;
  reviewerId: string | null;
}

const clients = new Set<Client>();

function send(client: Client, message: ServerMessage): void {
  if (client.socket.readyState === client.socket.OPEN) {
    client.socket.send(JSON.stringify(message));
  }
}

function broadcast(message: ServerMessage, except?: Client): void {
  for (const client of clients) {
    if (client !== except) send(client, message);
  }
}

const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/api/review") {
    response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    response.end(JSON.stringify({ diff: sampleDiff, language: "typescript", ...state.snapshot() }));
    return;
  }
  if (request.method === "GET" && request.url === "/api/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }
  response.writeHead(404).end();
});

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (socket) => {
  const client: Client = { socket, reviewerId: null };
  clients.add(client);

  socket.on("message", (raw) => {
    let value: unknown;
    try {
      value = JSON.parse(raw.toString("utf8")) as unknown;
    } catch {
      return;
    }
    const parsed = ClientMessageSchema.safeParse(value);
    if (!parsed.success) return;
    const message = parsed.data;

    if (message.type === "hello") {
      client.reviewerId = message.reviewerId;
      state.ensureReviewer(message.reviewerId);
      const snapshot = state.snapshot();
      send(client, { type: "bootstrap", reviewers: snapshot.reviewers, threads: snapshot.threads });
      return;
    }

    if (client.reviewerId === null) {
      send(client, { type: "reject", opId: message.opId, reason: "reviewer_not_identified" });
      return;
    }

    switch (message.type) {
      case "addThread": {
        const thread = state.addThread(client.reviewerId, message.side, message.line, message.body);
        send(client, { type: "threadAdded", opId: message.opId, thread });
        broadcast({ type: "threadAdded", thread }, client);
        return;
      }
      case "addReply": {
        const comment = state.addReply(client.reviewerId, message.threadId, message.body);
        if (!comment) {
          send(client, { type: "reject", opId: message.opId, reason: "thread_not_found" });
          return;
        }
        send(client, { type: "replyAdded", opId: message.opId, threadId: message.threadId, comment });
        broadcast({ type: "replyAdded", threadId: message.threadId, comment }, client);
        return;
      }
      case "setResolved": {
        const thread = state.setResolved(message.threadId, message.resolved);
        if (!thread) {
          send(client, { type: "reject", opId: message.opId, reason: "thread_not_found" });
          return;
        }
        send(client, {
          type: "threadResolved",
          opId: message.opId,
          threadId: message.threadId,
          resolved: thread.resolved,
        });
        broadcast({ type: "threadResolved", threadId: message.threadId, resolved: thread.resolved }, client);
        return;
      }
      case "setReviewerStatus": {
        const reviewer = state.setReviewerStatus(client.reviewerId, message.status);
        send(client, {
          type: "reviewerStatusChanged",
          opId: message.opId,
          reviewerId: reviewer.id,
          status: reviewer.status,
        });
        broadcast({ type: "reviewerStatusChanged", reviewerId: reviewer.id, status: reviewer.status }, client);
        return;
      }
    }
  });

  socket.on("close", () => clients.delete(client));
  socket.on("error", () => clients.delete(client));
});

server.listen(PORT, () => {
  console.log(`[gpt55-server] listening on http://127.0.0.1:${PORT}`);
});
