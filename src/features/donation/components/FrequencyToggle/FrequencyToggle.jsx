import { useId } from "react";

import { cx } from "@/core/utils/cx";

import styles from "./FrequencyToggle.module.css";

const OPTIONS = [
  { value: "monthly", label: "Mensual" },
  { value: "once", label: "Una sola vez" },
];

/**
 * Elige la frecuencia de la donación con radios nativos; la opción elegida se
 * marca con un subrayado naranja.
 * @param {{
 *   value: "monthly" | "once",
 *   onChange: (value: "monthly" | "once") => void,
 * }} props
 */
export function FrequencyToggle({ value, onChange }) {
  const name = useId();

  return (
    <div role="radiogroup" aria-label="Frecuencia de la donación" className={styles.group}>
      {OPTIONS.map(({ value: optionValue, label }) => (
        <label key={optionValue} className={cx(styles.option, value === optionValue && styles.selected)}>
          <input
            type="radio"
            name={name}
            className="sr-only"
            value={optionValue}
            checked={value === optionValue}
            onChange={() => onChange(optionValue)}
          />
          {label}
        </label>
      ))}
    </div>
  );
}
