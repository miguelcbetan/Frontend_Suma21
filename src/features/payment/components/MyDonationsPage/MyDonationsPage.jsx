import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cx } from "@/core/utils/cx";

import rows from "../shared/rows.module.css";

import { InKindDonationsPanel } from "./InKindDonationsPanel.jsx";
import { MonetaryDonationsPanel } from "./MonetaryDonationsPanel.jsx";
import styles from "./MyDonationsPage.module.css";
import { SponsorPlansPanel } from "./SponsorPlansPanel.jsx";

const TABS = [
  { id: "monetarias", label: "Monetarias", icon: "heart" },
  { id: "especie", label: "En especie", icon: "package" },
  { id: "plan-padrino", label: "Plan Padrino", icon: "users" },
];

/**
 * Página `/mis-donaciones`: todo lo relacionado con las donaciones del usuario,
 * en tres pestañas (`?tipo=`):
 * - **Monetarias**: historial, pagar o cancelar pendientes y certificado de las pagadas.
 * - **En especie**: artículos entregados y su certificado.
 * - **Plan Padrino**: planes y cuotas, pagar cuotas, cancelar el plan y
 *   certificado de cada cuota pagada.
 * Las compras de la tienda se gestionan en «Mis compras».
 * @param {{ renderSponsorButton?: () => import("react").ReactNode }} props
 */
export function MyDonationsPage({ renderSponsorButton }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tipo");
  const tab = TABS.some(({ id }) => id === requested) ? requested : TABS[0].id;
  const [reloadKey, setReloadKey] = useState(0);

  function selectTab(id) {
    setSearchParams(id === TABS[0].id ? {} : { tipo: id }, { replace: true });
  }

  function handleTabKeyDown(event) {
    const index = TABS.findIndex(({ id }) => id === tab);
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = TABS[(index + step + TABS.length) % TABS.length];
    selectTab(next.id);
    document.getElementById(`donations-tab-${next.id}`)?.focus();
  }

  let panel;
  if (tab === "especie") panel = <InKindDonationsPanel reloadKey={reloadKey} />;
  else if (tab === "plan-padrino") {
    panel = <SponsorPlansPanel reloadKey={reloadKey} renderSponsorButton={renderSponsorButton} />;
  } else panel = <MonetaryDonationsPanel reloadKey={reloadKey} />;

  return (
    <Container className={rows.page}>
      <PageHeader
        eyebrow="Tu cuenta"
        title="Mis donaciones"
        description="Tus donaciones monetarias, en especie y del Plan Padrino: su estado, sus pagos pendientes y los certificados de las exitosas."
        actions={
          <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
            <Icon name="refresh" size={18} />
            Actualizar
          </Button>
        }
      />

      <div role="tablist" aria-label="Tipo de donación" className={styles.tabs}>
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`donations-tab-${id}`}
            aria-selected={tab === id}
            aria-controls="donations-panel"
            tabIndex={tab === id ? 0 : -1}
            className={cx(styles.tab, tab === id && styles.selected)}
            onClick={() => selectTab(id)}
            onKeyDown={handleTabKeyDown}
          >
            <Icon name={icon} size={18} />
            {label}
          </button>
        ))}
      </div>

      {/* `key` vuelve a montar el panel al cambiar de pestaña: cada uno carga sus datos. */}
      <div role="tabpanel" id="donations-panel" aria-labelledby={`donations-tab-${tab}`} className={styles.panel} key={tab}>
        {panel}
      </div>
    </Container>
  );
}
