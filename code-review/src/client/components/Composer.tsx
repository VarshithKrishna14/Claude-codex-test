import { useEffect, useRef, useState } from "react";
import styles from "../styles/Composer.module.css";

interface ComposerProps {
  readonly placeholder: string;
  readonly submitLabel: string;
  readonly onSubmit: (body: string) => void;
  readonly onCancel?: () => void;
  readonly autoFocus?: boolean;
}

export function Composer(props: ComposerProps): JSX.Element {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (props.autoFocus && ref.current) ref.current.focus();
  }, [props.autoFocus]);

  function submit(): void {
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    props.onSubmit(trimmed);
    setValue("");
  }

  return (
    <div className={styles.composer}>
      <textarea
        ref={ref}
        className={styles.textarea}
        placeholder={props.placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape" && props.onCancel) {
            e.preventDefault();
            props.onCancel();
          }
        }}
        rows={3}
      />
      <div className={styles.actions}>
        {props.onCancel ? (
          <button type="button" className={styles.cancel} onClick={props.onCancel}>
            Cancel
          </button>
        ) : null}
        <button
          type="button"
          className={styles.submit}
          onClick={submit}
          disabled={value.trim().length === 0}
        >
          {props.submitLabel}
        </button>
      </div>
    </div>
  );
}
