import { useId, useState } from "react";

import { cx } from "@/core/utils/cx";

import styles from "./Field.module.css";

/**
 * Campo de formulario con etiqueta, ayuda y error asociados. Por defecto es
 * un `<input>`; con `as="select"` o `as="textarea"` cambia el control. Los
 * campos `type="password"` incluyen un botón para mostrar u ocultar el texto.
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
  const [revealed, setRevealed] = useState(false);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const isPassword = Control === "input" && rest.type === "password";
  const type = isPassword && revealed ? "text" : rest.type;

  const control = (
    <Control
      id={id}
      className={cx(styles.control, isPassword && styles.withToggle)}
      aria-invalid={error ? true : undefined}
      aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
      {...rest}
      type={Control === "input" ? type : undefined}
    >
      {children}
    </Control>
  );

  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {rest.required ? (
          <span aria-hidden="true" className={styles.required}>
            {" "}
            *
          </span>
        ) : null}
      </label>
      {isPassword ? (
        <div className={styles.inputWrap}>
          {control}
          <button
            type="button"
            className={styles.toggle}
            aria-controls={id}
            aria-pressed={revealed}
            onClick={() => setRevealed((value) => !value)}
          >
            {revealed ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      ) : (
        control
      )}
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
