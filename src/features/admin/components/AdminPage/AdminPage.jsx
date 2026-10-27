import { useEffect, useState } from "react";

import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { healthService } from "@/core/api";
import { cx } from "@/core/utils/cx";

import { SECTIONS } from "../../resources.js";
import { ResourcePanel } from "../ResourcePanel";

import styles from "./AdminPage.module.css";

const HEALTH_LABELS = {
  checking: { tone: "neutral", text: "Comprobando servidor…" },
  ok: { tone: "green", text: "Servidor conectado" },
  down: { tone: "orange", text: "Servidor sin respuesta" },
};

/** Indicador de `GET /health`: confirma que el backend alcanza la base de datos. */
function ServerStatus() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let cancelled = false;
    healthService
      .check()
      .then((data) => !cancelled && setStatus(data?.status === "ok" ? "ok" : "down"))
      .catch(() => !cancelled && setStatus("down"));
    return () => {
      cancelled = true;
    };
  }, []);

  const { tone, text } = HEALTH_LABELS[status];
  return <Badge tone={tone}>{text}</Badge>;
}

/** Panel de administración: una pestaña por grupo de endpoints de API.md. */
export function AdminPage() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  const section = SECTIONS.find(({ id }) => id === activeId);

  return (
    <Container className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Panel de administración</h1>
        <ServerStatus />
      </header>

      <div role="tablist" aria-label="Secciones" className={styles.tabs}>
        {SECTIONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`admin-tab-${id}`}
            aria-selected={id === activeId}
            aria-controls="admin-panel"
            className={cx(styles.tab, id === activeId && styles.selected)}
            onClick={() => setActiveId(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="admin-panel" aria-labelledby={`admin-tab-${activeId}`}>
        <h2 className={styles.sectionTitle}>{section.label}</h2>
        <ResourcePanel key={section.id} section={section} />
      </div>
    </Container>
  );
}
