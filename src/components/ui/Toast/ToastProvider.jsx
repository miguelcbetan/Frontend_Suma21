import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { cx } from "@/core/utils/cx";

import styles from "./Toast.module.css";
import { ToastContext } from "./toastContext.js";

const DEFAULT_DURATION = 4000;
const EXIT_MS = 300;
const MAX_VISIBLE = 4;
const ICONS = { success: "checkCircle", info: "info" };

/** Una notificación: se oculta sola; pasar el mouse o el foco pausa el conteo. */
function ToastItem({ toast, onRemove }) {
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.duration);

  useEffect(() => {
    if (leaving || paused) return undefined;
    const started = Date.now();
    const timer = setTimeout(() => setLeaving(true), Math.max(remaining.current, 0));
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - started;
    };
  }, [leaving, paused]);

  useEffect(() => {
    if (!leaving) return undefined;
    const timer = setTimeout(() => onRemove(toast.id), EXIT_MS);
    return () => clearTimeout(timer);
  }, [leaving, onRemove, toast.id]);

  return (
    <div
      className={cx(styles.toast, styles[toast.tone], leaving && styles.leaving)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className={styles.icon}>
        <Icon name={ICONS[toast.tone] ?? "info"} size={20} />
      </span>
      <p className={styles.text}>{toast.text}</p>
      <button type="button" className={styles.close} aria-label="Cerrar notificación" onClick={() => setLeaving(true)}>
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}

/**
 * Notificaciones emergentes arriba a la derecha para confirmaciones de éxito
 * o información. Los errores se siguen mostrando dentro de cada pantalla.
 * @param {{ children: import("react").ReactNode }} props
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const remove = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((text, { tone = "success", duration = DEFAULT_DURATION } = {}) => {
    if (!text) return;
    nextId.current += 1;
    const toast = { id: nextId.current, text, tone, duration };
    setToasts((current) => [...current.slice(-(MAX_VISIBLE - 1)), toast]);
  }, []);

  const value = useMemo(
    () => ({
      show,
      success: (text) => show(text, { tone: "success" }),
      info: (text) => show(text, { tone: "info" }),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.viewport} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
