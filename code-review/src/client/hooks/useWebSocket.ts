import { useEffect, useRef } from "react";
import { useReviewStore } from "../store/reviewStore.js";
import {
  ServerMessageSchema,
  type ClientMessage,
} from "../../shared/messages.js";

const BACKOFFS_MS: ReadonlyArray<number> = [500, 1000, 2000, 4000, 8000];
const MAX_RETRIES = 5;

export function useWebSocket(): void {
  const currentUserId = useReviewStore((s) => s.currentUserId);
  const setWsStatus = useReviewStore((s) => s.setWsStatus);
  const setSendMessage = useReviewStore((s) => s.setSendMessage);
  const applyServerEvent = useReviewStore((s) => s.applyServerEvent);

  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef<number>(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userIdRef = useRef<string>(currentUserId);

  // Keep latest userId available to reconnects without rebinding the effect.
  useEffect(() => {
    userIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    let disposed = false;

    const send = (msg: ClientMessage): void => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    };
    setSendMessage(send);

    const connect = (): void => {
      if (disposed) return;
      const url = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`;
      setWsStatus(retryCountRef.current === 0 ? "connecting" : "reconnecting");
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        if (disposed) return;
        retryCountRef.current = 0;
        setWsStatus("open");
        ws.send(JSON.stringify({ type: "hello", userId: userIdRef.current } satisfies ClientMessage));
      });

      ws.addEventListener("message", (ev: MessageEvent<string>) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(ev.data);
        } catch {
          return;
        }
        const result = ServerMessageSchema.safeParse(parsed);
        if (!result.success) return;
        applyServerEvent(result.data);
      });

      ws.addEventListener("close", () => {
        if (disposed) return;
        wsRef.current = null;
        if (retryCountRef.current >= MAX_RETRIES) {
          setWsStatus("closed");
          return;
        }
        const delay = BACKOFFS_MS[retryCountRef.current] ?? BACKOFFS_MS[BACKOFFS_MS.length - 1] ?? 8000;
        retryCountRef.current += 1;
        setWsStatus("reconnecting");
        reconnectTimerRef.current = setTimeout(connect, delay);
      });

      ws.addEventListener("error", () => {
        // close handler will run; backoff happens there
      });
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      const ws = wsRef.current;
      wsRef.current = null;
      setSendMessage(null);
      ws?.close();
    };
  }, [applyServerEvent, setSendMessage, setWsStatus]);

  // Re-send hello if the user identity changes mid-session.
  useEffect(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "hello", userId: currentUserId } satisfies ClientMessage));
    }
  }, [currentUserId]);
}
