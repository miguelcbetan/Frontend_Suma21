import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";

import rows from "../shared/rows.module.css";

/** Esqueleto de carga de una pestaña de «Mis donaciones». */
export function ListSkeleton({ label, rowHeight = "6.5rem" }) {
  return (
    <>
      <p role="status" className="sr-only">
        {label}
      </p>
      <div className={rows.list} aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <Skeleton key={n} height={rowHeight} radius="lg" />
        ))}
      </div>
    </>
  );
}

/** Error al cargar una pestaña, con reintento. */
export function PanelError({ message, onRetry }) {
  return (
    <EmptyState
      icon="alert"
      tone="danger"
      title="No pudimos cargar tus donaciones"
      description={message}
      actions={
        <Button variant="outline" onClick={onRetry}>
          <Icon name="refresh" size={18} />
          Reintentar
        </Button>
      }
    />
  );
}
