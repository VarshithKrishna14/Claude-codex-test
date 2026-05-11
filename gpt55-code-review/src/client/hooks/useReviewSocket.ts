import { useEffect, useRef } from "react";
import { ServerMessageSchema, type ClientMessage } from "../../shared/messages.js";
import { useReviewStore } from "../store/reviewStore.js";

const DELAYS = [500, 1_000, 2_000, 4_000, 8_000] as const;

export function useReviewSocket(): void {
  const reviewerId = useReviewStore((state) => state.currentReviewerId);
  const setSocketStatus = useReviewStore((state) => state.setSocketStatus);
  const setSender = useReviewStore((state) => state.setSender);
  const applyServerMessage = useReviewStore((state) => state.applyServerMessage);
  const reviewerRef = useRef(reviewerId);
  const socketRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    reviewerRef.current = reviewerId;
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "hello", reviewerId } satisfies ClientMessage));
    }
  }, [reviewerId]);

  useEffect(() => {
    let closed = false;
    const send = (message: ClientMessage): void => {
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
    };
    setSender(send);

    const connect = (): void => {
      if (closed) return;
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const socket = new WebSocket(`${protocol}://${window.location.host}/ws`);
      socketRef.current = socket;
      setSocketStatus(retryRef.current === 0 ? "connecting" : "reconnecting");

      socket.addEventListener("open", () => {
        retryRef.current = 0;
        setSocketStatus("open");
        socket.send(JSON.stringify({ type: "hello", reviewerId: reviewerRef.current } satisfies ClientMessage));
      });

      socket.addEventListener("message", (event: MessageEvent<string>) => {
        let value: unknown;
        try {
          value = JSON.parse(event.data) as unknown;
        } catch {
          return;
        }
        const parsed = ServerMessageSchema.safeParse(value);
        if (parsed.success) applyServerMessage(parsed.data);
      });

      socket.addEventListener("close", () => {
        if (closed) return;
        socketRef.current = null;
        if (retryRef.current >= DELAYS.length) {
          setSocketStatus("closed");
          return;
        }
        const delay = DELAYS[retryRef.current] ?? 8_000;
        retryRef.current += 1;
        setSocketStatus("reconnecting");
        timerRef.current = setTimeout(connect, delay);
      });
    };

    connect();
    return () => {
      closed = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      setSender(null);
      socketRef.current?.close();
    };
  }, [applyServerMessage, setSender, setSocketStatus]);
}
