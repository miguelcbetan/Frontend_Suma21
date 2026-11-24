import { useId, useState } from "react";

import { cx } from "@/core/utils/cx";

import styles from "./Field.module.css";

/**
 * Campo de formulario con etiqueta, ayuda y error asociados. Por defecto es
 * un `<input>`; con `as="select"` o `as="textarea"` cambia el control. Los
 * campos `type="password"` incluyen un botón para mostrar u ocultar el texto, y
 * los inputs numéricos o de texto aceptan `prefix` o `suffix` visuales.
 * @param {{
 *   label: string,
 *   as?: "input" | "select" | "textarea",
 *   hint?: string,
 *   error?: string,
 *   prefix?: import("react").ReactNode,
 *   suffix?: import("react").ReactNode,
 *   className?: string,
 * } & Record<string, any>} props
 */
export function Field({ label, as: Control = "input", hint, error, prefix, suffix, className, children, ...rest }) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const isPassword = Control === "input" && rest.type === "password";
  const hasAffix = Control === "input" && !isPassword && (prefix != null || suffix != null);
  const type = isPassword && revealed ? "text" : rest.type;

  const control = (
    <Control
      id={id}
      className={cx(
        styles.control,
        Control === "select" && styles.select,
        isPassword && styles.withToggle,
        hasAffix && styles.affixInput,
      )}
      aria-invalid={error ? true : undefined}
      aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
      {...rest}
      type={Control === "input" ? type : undefined}
    >
      {children}
    </Control>
  );

  let renderedControl = control;
  if (isPassword) {
    renderedControl = (
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
    );
  } else if (hasAffix) {
    renderedControl = (
      <div className={cx(styles.affixBox, error && styles.affixError, rest.disabled && styles.affixDisabled)}>
        {prefix != null ? (
          <span className={styles.affix} aria-hidden="true">
            {prefix}
          </span>
        ) : null}
        {control}
        {suffix != null ? (
          <span className={cx(styles.affix, styles.suffix)} aria-hidden="true">
            {suffix}
          </span>
        ) : null}
      </div>
    );
  }

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
      {renderedControl}
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
