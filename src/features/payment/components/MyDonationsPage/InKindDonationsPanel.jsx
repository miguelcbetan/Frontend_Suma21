import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClassName } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { ApiError, describeError, donationsService } from "@/core/api";
import { formatPlanDate } from "@/core/utils/sponsorPlan";

import { formatCop } from "../PaymentResultPage/format.js";
import rows from "../shared/rows.module.css";

import styles from "./MyDonationsPage.module.css";
import { ListSkeleton, PanelError } from "./panelStates.jsx";
import { useCertificateDownload } from "./useCertificateDownload.js";

async function fetchDonations() {
  const payload = await donationsService.listMyInKind();
  if (!Array.isArray(payload)) {
    throw new ApiError("El servidor respondió de forma inesperada al consultar tus donaciones en especie.");
  }
  return payload;
}

/**
 * Pestaña «En especie» de «Mis donaciones»: artículos entregados a la fundación
 * (`GET /donations/inkind/me`, incluye los registrados por ADMIN antes de
 * vincular la cuenta) con su certificado (`GET /donations/inkind/:id/certificate`).
 * @param {{ reloadKey: number }} props
 */
export function InKindDonationsPanel({ reloadKey }) {
  const [data, setData] = useState({ status: "loading", items: [], error: "" });
  const [retryKey, setRetryKey] = useState(0);
  const certificate = useCertificateDownload();

  useEffect(() => {
    let cancelled = false;
    fetchDonations()
      .then((items) => !cancelled && setData({ status: "ready", items, error: "" }))
      .catch((error) => !cancelled && setData({ status: "error", items: [], error: describeError(error).message }));
    return () => {
      cancelled = true;
    };
  }, [reloadKey, retryKey]);

  const busy = certificate.generating !== null;

  return (
    <>
      {certificate.error ? <Alert tone="error">{certificate.error}</Alert> : null}

      {data.status === "loading" ? <ListSkeleton label="Cargando tus donaciones en especie…" /> : null}
      {data.status === "error" ? <PanelError message={data.error} onRetry={() => setRetryKey((key) => key + 1)} /> : null}

      {data.status === "ready" && data.items.length === 0 ? (
        <EmptyState
          icon="package"
          tone="brand"
          title="Aún no tienes donaciones en especie"
          description="Cuando la fundación registre los artículos que entregaste, aparecerán aquí con su certificado de donación."
          actions={
            <Link to="/donaciones-en-especie" className={buttonClassName()}>
              Ver qué se necesita
            </Link>
          }
        />
      ) : null}

      {data.status === "ready" && data.items.length > 0 ? (
        <ul className={rows.list}>
          {data.items.map((donation) => {
            const items = Array.isArray(donation.items) ? donation.items : [];
            const generating = certificate.generating === donation.inkind_id;
            return (
              <li key={donation.inkind_id} className={rows.row}>
                <span className={rows.kindIcon}>
                  <Icon name="package" size={20} />
                </span>
                <div className={rows.main}>
                  <div className={rows.titleRow}>
                    <h3 className={rows.kind}>Donación en especie</h3>
                    <Badge tone="green">Recibida</Badge>
                  </div>
                  {items.length > 0 ? (
                    <ul className={rows.items} aria-label="Artículos donados">
                      {items.map((item) => (
                        <li key={item.inventory_item_id}>
                          <span className={rows.qty}>{item.quantity} ×</span> {item.item_name}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <dl className={rows.details}>
                    <div>
                      <dt>Fecha de la donación</dt>
                      <dd>{formatPlanDate(donation.donation_date)}</dd>
                    </div>
                    <div>
                      <dt>Año gravable</dt>
                      <dd>{donation.tax_year ?? "—"}</dd>
                    </div>
                    {donation.certificate_number ? (
                      <div>
                        <dt>Certificado</dt>
                        <dd className={rows.mono}>{donation.certificate_number}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {donation.notes ? <p className={styles.notes}>{donation.notes}</p> : null}
                </div>
                <div className={rows.side}>
                  <p className={rows.amount}>
                    <span className={styles.amountLabel}>Valor estimado</span>
                    {formatCop(Number(donation.total_estimated_amount ?? 0))}
                  </p>
                  <div className={rows.actions}>
                    {donation.can_download_certificate ? (
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          certificate.download(
                            donation.inkind_id,
                            () => donationsService.inKindCertificate(donation.inkind_id),
                            `certificado-${donation.certificate_number ?? `especie-${donation.inkind_id}`}.pdf`,
                          )
                        }
                      >
                        <Icon name="receipt" size={16} />
                        {generating ? "Generando…" : "Descargar certificado"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </>
  );
}
