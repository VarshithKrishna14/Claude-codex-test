import { useState } from "react";
import type { Side } from "../../shared/types.js";
import { useReviewStore } from "../store/reviewStore.js";
import styles from "../styles/LineComposer.module.css";

interface Props {
  readonly side: Side;
  readonly line: number;
  readonly onClose: () => void;
}

export function LineComposer({ side, line, onClose }: Props): JSX.Element {
  const [body, setBody] = useState("");
  const addThread = useReviewStore((state) => state.addThread);
  return (
    <form
      className={styles.composer}
      onSubmit={(event) => {
        event.preventDefault();
        if (body.trim()) {
          addThread(side, line, body.trim());
          onClose();
        }
      }}
    >
      <input value={body} onChange={(event) => setBody(event.target.value)} placeholder={`Comment on ${side}:${line}`} autoFocus />
      <button type="submit">Comment</button>
      <button type="button" onClick={onClose}>Cancel</button>
    </form>
  );
}
