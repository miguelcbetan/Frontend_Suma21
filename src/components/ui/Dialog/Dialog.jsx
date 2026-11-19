import { useEffect, useRef } from "react";

import { cx } from "@/core/utils/cx";

import styles from "./Dialog.module.css";

/**
 * Diálogo modal sobre `<dialog>` nativo: el navegador gestiona el foco, la
 * tecla Escape, la inercia del fondo y la capa superior. Permanece montado
 * para conservar el estado de su contenido entre aperturas.
 * @param {Omit<import("react").ComponentPropsWithRef<"dialog">, "open" | "onClose"> & {
 *   open: boolean,
 *   onClose: () => void,
 *   labelledBy: string,
 *   variant?: "fullscreen" | "centered",
 *   closeLabel?: string,
 *   closable?: boolean,
 * }} props
 *
 * Con `closable={false}` no hay botón de cerrar y Escape no cierra el diálogo:
 * solo se cierra cuando `open` pasa a `false`.
 */
export function Dialog({
  open,
  onClose,
  labelledBy,
  variant = "centered",
  closeLabel = "Cerrar",
  closable = true,
  className,
  children,
  ...rest
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      className={cx(styles.dialog, styles[variant], className)}
      onClose={() => {
        // Chrome puede cerrar con un segundo Escape aunque se cancele el evento:
        // un diálogo no cerrable que siga `open` vuelve a mostrarse.
        if (!closable && open) dialogRef.current?.showModal();
        else onClose?.();
      }}
      onCancel={closable ? undefined : (event) => event.preventDefault()}
      {...rest}
    >
      {closable ? (
        <button type="button" className={styles.close} aria-label={closeLabel} onClick={onClose}>
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : null}
      {children}
    </dialog>
  );
}
