import { useId } from "react";

import { cx } from "@/core/utils/cx";

import styles from "./Field.module.css";

/**
 * Campo de formulario con etiqueta, ayuda y error asociados. Por defecto es
 * un `<input>`; con `as="select"` o `as="textarea"` cambia el control.
 * @param {{
 *   label: string,
 *   as?: "input" | "select" | "textarea",
 *   hint?: string,
 *   error?: string,
 *   className?: string,
 * } & Record<string, any>} props
 */
export function Field({ label, as: Control = "input", hint, error, className, children, ...rest }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {rest.required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <Control
        id={id}
        className={styles.control}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        {...rest}
      >
        {children}
      </Control>
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
