import { useEffect, useState } from "react";

import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { healthService } from "@/core/api";
import { cx } from "@/core/utils/cx";

import { SECTIONS } from "../../resources.js";
import { InKindDonationPanel } from "../InKindDonationPanel";
import { OverviewPanel } from "../OverviewPanel";
import { ReportPanel } from "../ReportPanel";
import { ResourcePanel } from "../ResourcePanel";

import styles from "./AdminPage.module.css";

const HEALTH_LABELS = {
  checking: { tone: "neutral", text: "Comprobando servidor…" },
  ok: { tone: "green", text: "Servidor conectado" },
  down: { tone: "danger", text: "Servidor sin respuesta" },
};

const OVERVIEW = {
  id: "overview",
  label: "Resumen",
  icon: "home",
  description: "Estado general de la tienda, el inventario y las ventas. Selecciona un indicador para ver el detalle.",
};

const IN_KIND_DONATION = {
  id: "inkind-donation",
  label: "Registrar donación en especie",
  icon: "heart",
  description: "Registra los artículos recibidos. La administradora se identifica automáticamente desde su sesión.",
};

const NAV = [OVERVIEW, ...SECTIONS, IN_KIND_DONATION];

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
  return (
    <Badge tone={tone}>
      <span className={cx(styles.dot, styles[status])} aria-hidden="true" />
      {text}
    </Badge>
  );
}

/** Panel de administración: un resumen y una sección por grupo de endpoints de `/api/v1` (ver docs/integracion-backend.md). */
export function AdminPage() {
  const [activeId, setActiveId] = useState(OVERVIEW.id);
  const section = NAV.find(({ id }) => id === activeId);

  function navigate(id) {
    setActiveId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  let panel;
  if (section.id === OVERVIEW.id) panel = <OverviewPanel onNavigate={navigate} />;
  else if (section.id === IN_KIND_DONATION.id) panel = <InKindDonationPanel />;
  else if (section.report) panel = <ReportPanel key={section.id} section={section} />;
  else panel = <ResourcePanel key={section.id} section={section} />;

  return (
    <Container className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Administración</p>
          <h1 className={styles.title}>Panel de administración</h1>
        </div>
        <ServerStatus />
      </header>

      <div className={styles.layout}>
        <nav className={styles.nav} aria-label="Secciones del panel">
          <div role="tablist" aria-label="Secciones" aria-orientation="vertical" className={styles.tabs}>
            {NAV.map(({ id, label, icon }) => (
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
                <Icon name={icon ?? "info"} size={18} />
                {label}
              </button>
            ))}
          </div>
        </nav>

        <div role="tabpanel" id="admin-panel" aria-labelledby={`admin-tab-${activeId}`} className={styles.content}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{section.label}</h2>
            {section.description ? <p className={styles.sectionDescription}>{section.description}</p> : null}
          </div>
          {panel}
        </div>
      </div>
    </Container>
  );
}
