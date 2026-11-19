import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClassName } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { ApiError, describeError, donationsService } from "@/core/api";
import { cx } from "@/core/utils/cx";
import { checkoutUrlWithReturn, isWompiCheckoutUrl, reserveCheckoutTab } from "@/core/utils/wompiWidget";

import { formatCop, formatDateTime } from "../PaymentResultPage/format.js";
import rows from "../shared/rows.module.css";

import { ListSkeleton, PanelError } from "./panelStates.jsx";
import { useCertificateDownload } from "./useCertificateDownload.js";

const STATUS = {
  PENDING: { label: "Pendiente de pago", tone: "orange" },
  APPROVED: { label: "Pagada", tone: "green" },
  DECLINED: { label: "Cancelada o rechazada", tone: "danger" },
  VOIDED: { label: "Anulada", tone: "neutral" },
  ERROR: { label: "Error en el pago", tone: "danger" },
};

/** `GET /donations/monetary/me` (sin cuotas del Plan Padrino); rechaza respuestas con otra forma. */
async function fetchDonations() {
  const payload = await donationsService.listMyMonetary();
  if (!Array.isArray(payload)) {
    throw new ApiError("El servidor respondió de forma inesperada al consultar tus donaciones monetarias.");
  }
  return payload;
}

function DonationCard({ donation, busy, activeAction, onPay, onCancel, onCertificate }) {
  const badge = STATUS[donation.status] ?? { label: donation.status, tone: "neutral" };
  const pending = donation.status === "PENDING";

  return (
    <li className={cx(rows.row, pending && rows.pendingRow)}>
      <span className={cx(rows.kindIcon, pending && rows.kindIconPending)}>
        <Icon name="heart" size={20} />
      </span>
      <div className={rows.main}>
        <div className={rows.titleRow}>
          <h3 className={rows.kind}>Donación monetaria</h3>
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </div>
        <dl className={rows.details}>
          <div>
            <dt>Fecha</dt>
            <dd>{donation.created_at ? formatDateTime(donation.created_at) : "—"}</dd>
          </div>
          {donation.transaction_reference ? (
            <div>
              <dt>Referencia</dt>
              <dd className={rows.mono}>{donation.transaction_reference}</dd>
            </div>
          ) : null}
          {donation.certificate_number ? (
            <div>
              <dt>Certificado</dt>
              <dd className={rows.mono}>{donation.certificate_number}</dd>
            </div>
          ) : null}
        </dl>
      </div>
      <div className={rows.side}>
        <p className={rows.amount}>{formatCop(Number(donation.amount ?? 0))}</p>
        <div className={rows.actions}>
          {pending ? (
            <>
              {donation.checkout_url ? (
                <Button size="sm" onClick={() => onPay(donation)} disabled={busy}>
                  <Icon name="coins" size={16} />
                  {activeAction === "pay" ? "Abriendo Wompi…" : "Continuar con el pago"}
                </Button>
              ) : null}
              <Button size="sm" variant="danger" onClick={() => onCancel(donation)} disabled={busy}>
                {activeAction === "cancel" ? "Cancelando…" : "Cancelar donación"}
              </Button>
            </>
          ) : null}
          {donation.can_download_certificate ? (
            <Button size="sm" onClick={() => onCertificate(donation)} disabled={busy}>
              <Icon name="receipt" size={16} />
              {activeAction === "certificate" ? "Generando…" : "Descargar certificado"}
            </Button>
          ) : !pending && donation.transaction_reference ? (
            <Link
              to={`/payment-result?reference=${encodeURIComponent(donation.transaction_reference)}`}
              className={buttonClassName({ variant: "outline", size: "sm" })}
            >
              Ver detalle
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/**
 * Pestaña «Monetarias» de «Mis donaciones»: historial completo de las
 * donaciones únicas (`GET /donations/monetary/me`). Las pendientes se pueden
 * pagar en Wompi o cancelar (`POST /donations/:id/cancel`); las aprobadas
 * descargan su certificado (`GET /donations/monetary/:id/certificate`).
 * @param {{ reloadKey: number }} props `reloadKey` cambia con «Actualizar».
 */
export function MonetaryDonationsPanel({ reloadKey }) {
  const [data, setData] = useState({ status: "loading", items: [], error: "" });
  const [retryKey, setRetryKey] = useState(0);
  const [active, setActive] = useState(null);
  const [notice, setNotice] = useState(null);
  const [confirm, setConfirm] = useState({ donation: null, pending: false, error: "" });
  const certificate = useCertificateDownload();
  const toast = useToast();

  const applyList = useCallback((items) => setData({ status: "ready", items, error: "" }), []);

  useEffect(() => {
    let cancelled = false;
    fetchDonations()
      .then((items) => !cancelled && applyList(items))
      .catch((error) => !cancelled && setData({ status: "error", items: [], error: describeError(error).message }));
    return () => {
      cancelled = true;
    };
  }, [reloadKey, retryKey, applyList]);

  // El pago se hace en otra pestaña: al volver a esta, si hay pendientes, se recarga la lista.
  const hasPending = data.items.some((item) => item.status === "PENDING");
  useEffect(() => {
    if (!hasPending) return undefined;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      fetchDonations()
        .then(applyList)
        .catch(() => {});
    };
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, [hasPending, applyList]);

  const busy = active !== null || confirm.pending || certificate.generating !== null;

  async function reloadQuietly() {
    try {
      applyList(await fetchDonations());
    } catch (error) {
      setNotice({ tone: "error", text: `No pudimos actualizar la lista: ${describeError(error).message}` });
    }
  }

  async function continuePayment(donation) {
    if (busy) return;
    // La pestaña se abre en el mismo clic para que el navegador no la bloquee.
    const tab = reserveCheckoutTab();
    setActive({ id: donation.donation_id, type: "pay" });
    setNotice(null);
    try {
      // Se vuelve a consultar para no usar un enlace viejo ni una donación ya resuelta.
      const items = await fetchDonations();
      applyList(items);
      const current = items.find((item) => String(item.donation_id) === String(donation.donation_id));
      if (!current || current.status !== "PENDING") {
        tab.close();
        toast.info("Esta donación ya no está pendiente de pago. Actualizamos la lista con su estado actual.");
        return;
      }
      if (!isWompiCheckoutUrl(current.checkout_url)) {
        tab.close();
        setNotice({ tone: "error", text: "El servidor no entregó un enlace de pago válido para esta donación." });
        return;
      }
      const url = checkoutUrlWithReturn(current.checkout_url, current.transaction_reference);
      if (tab.go(url)) {
        toast.info("Abrimos el pago de Wompi en otra pestaña. Cuando termines, vuelve aquí para ver el estado actualizado.");
      } else {
        setNotice({ tone: "info", text: "Tu navegador bloqueó la pestaña de pago.", url });
      }
    } catch (error) {
      tab.close();
      setNotice({ tone: "error", text: `No pudimos abrir el pago: ${describeError(error).message}` });
    } finally {
      setActive(null);
    }
  }

  function askCancel(donation) {
    if (busy) return;
    setNotice(null);
    setConfirm({ donation, pending: false, error: "" });
  }

  function closeConfirm() {
    if (confirm.pending) return;
    setConfirm({ donation: null, pending: false, error: "" });
  }

  async function cancelDonation() {
    const { donation } = confirm;
    if (confirm.pending || !donation) return;
    setConfirm({ donation, pending: true, error: "" });
    setActive({ id: donation.donation_id, type: "cancel" });
    try {
      await donationsService.cancelMonetary(donation.donation_id);
      setConfirm({ donation: null, pending: false, error: "" });
      toast.success("Cancelaste la donación pendiente. No se realizará ningún cobro.");
    } catch (error) {
      if (error instanceof ApiError && (error.status === 409 || error.status === 404)) {
        setConfirm({ donation: null, pending: false, error: "" });
        setNotice({
          tone: "error",
          text: "No se pudo cancelar: la donación ya no estaba pendiente (pudo aprobarse o vencer). Revisa su estado actualizado.",
        });
      } else {
        setConfirm({ donation, pending: false, error: describeError(error).message });
      }
    } finally {
      await reloadQuietly();
      setActive(null);
    }
  }

  function downloadCertificate(donation) {
    if (busy) return;
    setNotice(null);
    certificate.download(
      donation.donation_id,
      () => donationsService.monetaryCertificate(donation.donation_id),
      `certificado-${donation.certificate_number ?? `donacion-${donation.donation_id}`}.pdf`,
    );
  }

  const actionFor = (donation) => {
    if (certificate.generating === donation.donation_id) return "certificate";
    return active && String(active.id) === String(donation.donation_id) ? active.type : null;
  };
  const pending = data.items.filter((item) => item.status === "PENDING");
  const history = data.items.filter((item) => item.status !== "PENDING");
  const renderCard = (donation) => (
    <DonationCard
      key={donation.donation_id}
      donation={donation}
      busy={busy}
      activeAction={actionFor(donation)}
      onPay={continuePayment}
      onCancel={askCancel}
      onCertificate={downloadCertificate}
    />
  );

  return (
    <>
      {notice ? (
        <Alert tone={notice.tone}>
          {notice.text}
          {notice.url ? (
            <>
              {" "}
              <a href={notice.url} target="_blank" rel="noopener noreferrer">
                Abrir el pago en Wompi
              </a>
            </>
          ) : null}
        </Alert>
      ) : null}
      {certificate.error ? <Alert tone="error">{certificate.error}</Alert> : null}

      {data.status === "loading" ? <ListSkeleton label="Cargando tus donaciones monetarias…" /> : null}
      {data.status === "error" ? <PanelError message={data.error} onRetry={() => setRetryKey((key) => key + 1)} /> : null}

      {data.status === "ready" && data.items.length === 0 ? (
        <EmptyState
          icon="heart"
          tone="brand"
          title="Aún no tienes donaciones monetarias"
          description="Cuando hagas una donación con «Donar ahora», aquí verás su estado y, al aprobarse, podrás descargar su certificado."
          actions={
            <Link to="/" className={buttonClassName()}>
              Ir al inicio para donar
            </Link>
          }
        />
      ) : null}

      {data.status === "ready" && pending.length > 0 ? (
        <section className={rows.section} aria-labelledby="monetary-pending">
          <div className={rows.sectionHead}>
            <h2 id="monetary-pending" className={rows.sectionTitle}>
              Requieren tu acción <span className={rows.count}>{pending.length}</span>
            </h2>
            <p className={rows.sectionText}>Completa el pago en Wompi o cancela la donación.</p>
          </div>
          <ul className={rows.list}>{pending.map(renderCard)}</ul>
        </section>
      ) : null}

      {data.status === "ready" && history.length > 0 ? (
        <section className={rows.section} aria-labelledby="monetary-history">
          <div className={rows.sectionHead}>
            <h2 id="monetary-history" className={rows.sectionTitle}>
              Historial
            </h2>
            <p className={rows.sectionText}>Las donaciones pagadas tienen su certificado de donación.</p>
          </div>
          <ul className={rows.list}>{history.map(renderCard)}</ul>
        </section>
      ) : null}

      <ConfirmDialog
        open={confirm.donation !== null}
        title="¿Cancelar esta donación?"
        confirmLabel="Sí, cancelar donación"
        cancelLabel="Volver"
        pending={confirm.pending}
        error={confirm.error}
        onConfirm={cancelDonation}
        onCancel={closeConfirm}
      >
        {confirm.donation ? (
          <p>
            Se anulará el pago pendiente de <strong>{formatCop(Number(confirm.donation.amount ?? 0))}</strong>. No se
            realizará ningún cobro y podrás hacer una nueva donación cuando lo desees.
          </p>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
