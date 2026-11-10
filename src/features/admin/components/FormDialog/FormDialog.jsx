import { useId } from "react";

import { Dialog } from "@/components/ui/Dialog";

import styles from "./FormDialog.module.css";

/**
 * Ventana emergente para un formulario del panel (crear, editar, ajustar
 * stock). Se monta solo mientras está abierta, así cada apertura empieza con
 * el formulario limpio. Esc y el botón ✕ llaman a `onClose`.
 * @param {{
 *   title: string,
 *   description?: import("react").ReactNode,
 *   onClose: () => void,
 *   children: import("react").ReactNode,
 * }} props
 */
export function FormDialog({ title, description, onClose, children }) {
  const titleId = useId();

  return (
    <Dialog open onClose={onClose} labelledBy={titleId} closeLabel="Cerrar" className={styles.dialog}>
      <div className={styles.content}>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {description ? <p className={styles.description}>{description}</p> : null}
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </Dialog>
  );
}
