import { useId } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

import styles from "./ConfirmDialog.module.css";

/**
 * Confirmación modal antes de una acción irreversible (p. ej. eliminar).
 * @param {{
 *   open: boolean,
 *   title: string,
 *   children: import("react").ReactNode,
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   pending?: boolean,
 *   error?: string,
 *   onConfirm: () => void,
 *   onCancel: () => void,
 * }} props
 */
export function ConfirmDialog({ open, title, children, confirmLabel = "Eliminar", cancelLabel = "Cancelar", pending = false, error, onConfirm, onCancel }) {
  const titleId = useId();

  return (
    <Dialog open={open} onClose={onCancel} labelledBy={titleId} closeLabel={cancelLabel} className={styles.dialog}>
      <div className={styles.content}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <div className={styles.body}>{children}</div>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <div className={styles.actions}>
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button variant="dangerSolid" onClick={onConfirm} disabled={pending}>
            {pending ? "Procesando…" : confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
