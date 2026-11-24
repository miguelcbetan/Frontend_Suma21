import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { cx } from "@/core/utils/cx";

import styles from "./SortMenu.module.css";

/**
 * Selector minimalista de ordenación en píldora con menú desplegable accesible.
 * Reemplaza al `<select>` nativo para garantizar centrado vertical idéntico al resto de filtros.
 */
export function SortMenu({
  label = "Ordenar",
  options,
  value,
  onChange,
  disabled = false,
  compact = false,
  mobileAlign = "end",
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const handlePointer = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const current = options.find((opt) => opt.value === value) ?? options[0];

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${label}: ${current?.label ?? ""}`}
        className={cx(styles.trigger, compact && styles.compact, open && styles.triggerOpen)}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={styles.triggerText}>{current?.label ?? label}</span>
        <Icon name="chevronDown" size={15} className={cx(styles.chevron, open && styles.chevronOpen)} />
      </button>

      {open ? (
        <div
          id={menuId}
          className={cx(styles.menu, mobileAlign === "start" && styles.menuMobileStart)}
          role="menu"
          aria-label={label}
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={cx(styles.item, selected && styles.itemSelected)}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {selected ? <Icon name="check" size={15} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
