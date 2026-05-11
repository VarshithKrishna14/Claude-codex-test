import WebSocket from "ws";

const URL = "ws://127.0.0.1:8877/ws";

function waitFor(ws, predicate, label) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.off("message", handler);
      reject(new Error(`timeout waiting for ${label}`));
    }, 1_000);
    const handler = (raw) => {
      const message = JSON.parse(raw.toString("utf8"));
      if (predicate(message)) {
        clearTimeout(timeout);
        ws.off("message", handler);
        resolve(message);
      }
    };
    ws.on("message", handler);
  });
}

async function open(ws) {
  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });
}

const alice = new WebSocket(URL);
const bob = new WebSocket(URL);
await Promise.all([open(alice), open(bob)]);

alice.send(JSON.stringify({ type: "hello", reviewerId: "alice" }));
bob.send(JSON.stringify({ type: "hello", reviewerId: "bob" }));
await Promise.all([
  waitFor(alice, (message) => message.type === "bootstrap", "alice bootstrap"),
  waitFor(bob, (message) => message.type === "bootstrap", "bob bootstrap"),
]);

const seenByBob = waitFor(bob, (message) => message.type === "threadAdded", "bob thread");
const ackByAlice = waitFor(alice, (message) => message.type === "threadAdded" && message.opId === "smoke-1", "alice ack");
const started = Date.now();
alice.send(JSON.stringify({ type: "addThread", opId: "smoke-1", side: "new", line: 12, body: "Smoke test thread" }));
await Promise.all([seenByBob, ackByAlice]);
const elapsed = Date.now() - started;
if (elapsed > 1_000) throw new Error(`broadcast took ${elapsed}ms`);

alice.close();
bob.close();
console.log(`[smoke] OK broadcast=${elapsed}ms`);
