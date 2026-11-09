import { useCallback, useEffect, useState } from "react";

import { Section } from "@/components/layout/Section";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { describeError, inventoryService, toList } from "@/core/api";

import styles from "./InKindDonationPage.module.css";

function ListSkeleton() {
  return (
    <div className={styles.grid} aria-hidden="true">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className={styles.skeletonCard}>
          <Skeleton height="1.25rem" width="60%" />
          <Skeleton height="0.875rem" />
          <Skeleton height="0.875rem" width="80%" />
        </div>
      ))}
    </div>
  );
}

/** Invitación a coordinar la donación con la fundación por WhatsApp. */
function ContactPanel() {
  return (
    <div className={styles.contact}>
      <span className={styles.contactIcon}>
        <Icon name="message" size={26} />
      </span>
      <h2 className={styles.contactTitle}>¿Quieres donar alguno de estos artículos?</h2>
      <p className={styles.contactText}>
        Escríbenos por WhatsApp para coordinar contigo la entrega de tu donación.
      </p>
      {/*
        PENDIENTE: este botón aún no tiene acción porque el número de WhatsApp
        no está disponible en el backend. Cuando exista, convertirlo en un enlace
        `https://wa.me/<número>` (con `target="_blank"` y `rel="noopener noreferrer"`).
      */}
      <Button size="lg" block className={styles.contactButton}>
        <Icon name="message" size={20} />
        Contactar por WhatsApp
      </Button>
    </div>
  );
}

/**
 * Página de donaciones en especie: muestra los artículos que la fundación
 * solicita (`GET /api/v1/inventory/needed`, público), que el administrador
 * marca como «Solicitado» en el panel. La donación no se registra en la
 * página: se coordina directamente con la fundación por WhatsApp.
 */
export function InKindDonationPage() {
  const [needed, setNeeded] = useState({ status: "loading", items: [], error: "" });

  const fetchNeeded = useCallback(
    () =>
      inventoryService
        .listNeeded()
        .then((payload) => setNeeded({ status: "ready", items: toList(payload), error: "" }))
        .catch((error) => setNeeded({ status: "error", items: [], error: describeError(error).message })),
    [],
  );

  useEffect(() => {
    fetchNeeded();
  }, [fetchNeeded]);

  function reload() {
    setNeeded((current) => ({ ...current, status: "loading", error: "" }));
    fetchNeeded();
  }

  return (
    <Section
      eyebrow="Donaciones en especie"
      title="Lo que la fundación necesita"
      description="Estos son los artículos que la fundación está solicitando. Si puedes aportar alguno, contáctanos para coordinar la entrega."
      headingLevel={1}
      align="start"
    >
      <div className={styles.layout}>
        <div className={styles.list}>
          {needed.status === "ready" && needed.items.length > 0 ? (
            <p className={styles.count}>
              {needed.items.length} {needed.items.length === 1 ? "artículo solicitado" : "artículos solicitados"}
            </p>
          ) : null}

          {needed.status === "loading" ? (
            <>
              <p role="status" className="sr-only">
                Cargando artículos solicitados…
              </p>
              <ListSkeleton />
            </>
          ) : null}

          {needed.status === "error" ? (
            <EmptyState
              icon="alert"
              tone="danger"
              title="No pudimos cargar la lista"
              description={needed.error}
              actions={
                <Button variant="outline" onClick={reload}>
                  <Icon name="refresh" size={18} />
                  Reintentar
                </Button>
              }
            />
          ) : null}

          {needed.status === "ready" && needed.items.length === 0 ? (
            <EmptyState
              icon="package"
              tone="brand"
              title="Por ahora no hay artículos solicitados"
              description="¡Gracias por tu interés! Vuelve pronto o apoya con una donación monetaria."
            />
          ) : null}

          {needed.items.length > 0 ? (
            <ul className={styles.grid}>
              {needed.items.map((item) => (
                <li key={item.id} className={styles.item}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemIcon}>
                      <Icon name="package" size={20} />
                    </span>
                    <Badge tone="orange">Solicitado</Badge>
                  </div>
                  <h2 className={styles.itemTitle}>{item.name}</h2>
                  {item.description ? <p className={styles.itemDescription}>{item.description}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <aside className={styles.aside} aria-label="Contacto para donar">
          <ContactPanel />
        </aside>
      </div>
    </Section>
  );
}
