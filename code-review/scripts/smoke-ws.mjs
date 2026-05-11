// Smoke test: two clients (Alice, Bob) connect, Alice adds a thread,
// verify Bob receives the thread_added event within 1s. Also verify Alice's ack.
import WebSocket from "ws";

const URL = "ws://localhost:8787/ws";
const TIMEOUT = 3000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const alice = new WebSocket(URL);
  const bob = new WebSocket(URL);

  await new Promise((res, rej) => {
    let opened = 0;
    alice.once("open", () => { opened++; if (opened === 2) res(); });
    bob.once("open",   () => { opened++; if (opened === 2) res(); });
    setTimeout(() => rej(new Error("open timeout")), TIMEOUT);
  });

  alice.send(JSON.stringify({ type: "hello", userId: "alice" }));
  bob.send(JSON.stringify({ type: "hello", userId: "bob" }));

  // Wait for bootstrap
  const bootstrapped = (ws, label) => new Promise((res) => {
    ws.once("message", (raw) => {
      const msg = JSON.parse(raw.toString("utf8"));
      console.log(`[${label}] first msg type=${msg.type}`);
      res(msg);
    });
  });
  await Promise.all([bootstrapped(alice, "alice"), bootstrapped(bob, "bob")]);

  // Now Alice adds a thread, expect Bob to see it
  const seenByBob = new Promise((res, rej) => {
    bob.on("message", (raw) => {
      const msg = JSON.parse(raw.toString("utf8"));
      if (msg.type === "thread_added") res(msg);
    });
    setTimeout(() => rej(new Error("bob did not receive thread_added in 1s")), 1500);
  });

  const ackByAlice = new Promise((res, rej) => {
    alice.on("message", (raw) => {
      const msg = JSON.parse(raw.toString("utf8"));
      if (msg.type === "thread_added" && msg.opId === "test-op-1") res(msg);
    });
    setTimeout(() => rej(new Error("alice did not receive ack")), 1500);
  });

  const t0 = Date.now();
  alice.send(JSON.stringify({
    type: "add_thread",
    opId: "test-op-1",
    side: "new",
    line: 10,
    body: "smoke test comment",
  }));

  const [bobEvent, aliceAck] = await Promise.all([seenByBob, ackByAlice]);
  const dt = Date.now() - t0;
  console.log(`[result] both received within ${dt}ms`);
  console.log(`[result] alice ack opId=${aliceAck.opId} -> canonical thread.id=${aliceAck.thread.id}`);
  console.log(`[result] bob saw thread.id=${bobEvent.thread.id} body=${bobEvent.thread.comments[0].body}`);

  // Now test reply propagation
  const replySeenByAlice = new Promise((res, rej) => {
    alice.on("message", (raw) => {
      const msg = JSON.parse(raw.toString("utf8"));
      if (msg.type === "reply_added") res(msg);
    });
    setTimeout(() => rej(new Error("alice did not see reply")), 1500);
  });
  bob.send(JSON.stringify({
    type: "add_reply",
    opId: "test-op-2",
    threadId: aliceAck.thread.id,
    body: "smoke test reply from bob",
  }));
  const reply = await replySeenByAlice;
  console.log(`[result] reply propagated: ${reply.comment.authorName} -> "${reply.comment.body}"`);

  // Status change
  const statusSeenByAlice = new Promise((res, rej) => {
    const handler = (raw) => {
      const msg = JSON.parse(raw.toString("utf8"));
      if (msg.type === "status_changed") {
        alice.off("message", handler);
        res(msg);
      }
    };
    alice.on("message", handler);
    setTimeout(() => rej(new Error("status timeout")), 1500);
  });
  bob.send(JSON.stringify({
    type: "set_status",
    opId: "test-op-3",
    status: "changes_requested",
  }));
  const status = await statusSeenByAlice;
  console.log(`[result] status change: ${status.userId} -> ${status.status}`);

  alice.close();
  bob.close();
  await wait(100);
  console.log("[smoke] OK");
}

main().catch((err) => {
  console.error("[smoke] FAILED:", err.message);
  process.exit(1);
});
