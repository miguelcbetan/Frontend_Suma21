import { cx } from "@/core/utils/cx";

import styles from "./Switch.module.css";

/**
 * Interruptor Sí/No (`role="switch"`). El cambio lo decide quien lo usa con `onChange`.
 * @param {{
 *   checked: boolean,
 *   onChange: (next: boolean) => void,
 *   label: string,
 *   disabled?: boolean,
 *   busy?: boolean,
 *   onLabel?: string,
 *   offLabel?: string,
 *   className?: string,
 * }} props `label` es el nombre accesible completo.
 */
export function Switch({ checked, onChange, label, disabled = false, busy = false, onLabel = "Sí", offLabel = "No", className }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      className={cx(styles.switch, checked && styles.on, busy && styles.busy, className)}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
      <span className={styles.text} aria-hidden="true">
        {checked ? onLabel : offLabel}
      </span>
    </button>
  );
}
