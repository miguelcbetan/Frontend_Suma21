import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { ApiError, describeError, donationsService } from "@/core/api";
import { cx } from "@/core/utils/cx";
import { savePaymentSession } from "@/core/utils/paymentSession";
import { PAYABLE_CYCLE_STATUSES, formatPlanDate, frequencyInfo, isCyclePaid } from "@/core/utils/sponsorPlan";
import { checkoutUrlWithReturn, isWompiCheckoutUrl, reserveCheckoutTab } from "@/core/utils/wompiWidget";

import { formatCop } from "../PaymentResultPage/format.js";
import rows from "../shared/rows.module.css";

import { ListSkeleton, PanelError } from "./panelStates.jsx";
import styles from "./SponsorPlansPanel.module.css";
import { useCertificateDownload } from "./useCertificateDownload.js";

const PLAN_STATUS = {
  ACTIVE: { label: "Activo", tone: "green" },
  CANCELLED: { label: "Cancelado", tone: "danger" },
  COMPLETED: { label: "Finalizado", tone: "neutral" },
  FINISHED: { label: "Finalizado", tone: "neutral" },
  EXPIRED: { label: "Finalizado", tone: "neutral" },
};

const CYCLE_STATUS = {
  PENDING: { label: "Pendiente de pago", tone: "orange" },
  OVERDUE: { label: "Vencida", tone: "danger" },
  PAID: { label: "Pagada", tone: "green" },
  CANCELLED: { label: "Cancelada", tone: "neutral" },
};

const statusOf = (map, status) => map[status] ?? { label: status, tone: "neutral" };
const cycleBadge = (cycle) => (isCyclePaid(cycle) ? CYCLE_STATUS.PAID : statusOf(CYCLE_STATUS, cycle.status));
const isPayable = (plan, cycle) =>
  plan.status === "ACTIVE" && PAYABLE_CYCLE_STATUSES.includes(cycle.status) && !isCyclePaid(cycle);

/** Planes de `GET /donations/sponsor-plans/me`; rechaza respuestas con otra forma. */
async function fetchPlans() {
  const payload = await donationsService.listSponsorPlans();
  if (!Array.isArray(payload)) throw new ApiError("El servidor respondió de forma inesperada al consultar tus planes.");
  return [...payload].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function CycleRow({ plan, cycle, busy, activeAction, onPay, onCertificate }) {
  const badge = cycleBadge(cycle);
  const paid = isCyclePaid(cycle);
  const payable = isPayable(plan, cycle);

  return (
    <li className={cx(styles.cycle, payable && styles.cyclePayable)}>
      <div className={styles.cycleInfo}>
        <p className={styles.cycleTitle}>
          Cuota {cycle.cycleNumber}
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </p>
        <p className={styles.cycleMeta}>
          {paid && cycle.paidAt ? `Pagada el ${formatPlanDate(cycle.paidAt)}` : `Vence el ${formatPlanDate(cycle.dueDate)}`}
          {cycle.certificateNumber ? ` · Certificado ${cycle.certificateNumber}` : ""}
        </p>
      </div>
      <p className={styles.cycleAmount}>{formatCop(Number(cycle.amount))}</p>
      <div className={styles.cycleActions}>
        {payable ? (
          <Button size="sm" onClick={() => onPay(cycle)} disabled={busy}>
            <Icon name="coins" size={16} />
            {activeAction === "pay" ? "Abriendo Wompi…" : "Pagar cuota"}
          </Button>
        ) : null}
        {paid && cycle.donationId ? (
          <Button size="sm" variant="outline" onClick={() => onCertificate(cycle)} disabled={busy}>
            <Icon name="receipt" size={16} />
            {activeAction === "certificate" ? "Generando…" : "Descargar certificado"}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function PlanCard({ plan, busy, actionFor, cancelling, onPay, onCertificate, onCancel }) {
  const frequency = frequencyInfo(plan.frequency);
  const badge = statusOf(PLAN_STATUS, plan.status);
  const isActive = plan.status === "ACTIVE";
  const cycles = [...(plan.cycles ?? [])].sort((a, b) => a.cycleNumber - b.cycleNumber);
  const paidCount = cycles.filter(isCyclePaid).length;
  const totalCycles = frequency.cycles ?? cycles.length;

  return (
    <li className={cx(styles.plan, isActive && styles.planActive)}>
      <header className={styles.planHeader}>
        <span className={cx(styles.planIcon, isActive && styles.planIconActive)}>
          <Icon name="users" size={22} />
        </span>
        <div className={styles.planTitleBlock}>
          <div className={styles.titleRow}>
            <h3 className={styles.planTitle}>Plan Padrino {frequency.label.toLowerCase()}</h3>
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </div>
          <p className={styles.planAmount}>
            {formatCop(Number(plan.amount))} <span>{frequency.every}</span>
          </p>
        </div>
        {isActive ? (
          <Button size="sm" variant="danger" onClick={() => onCancel(plan)} disabled={busy}>
            {cancelling ? "Cancelando…" : "Cancelar plan"}
          </Button>
        ) : null}
      </header>

      <dl className={styles.details}>
        <div>
          <dt>Inicio</dt>
          <dd>{formatPlanDate(plan.startDate)}</dd>
        </div>
        <div>
          <dt>Finaliza</dt>
          <dd>{formatPlanDate(plan.endDate)}</dd>
        </div>
        <div>
          <dt>Plan</dt>
          <dd className={styles.mono}>#{plan.sponsorPlanId}</dd>
        </div>
        <div>
          <dt>Cuotas pagadas</dt>
          <dd>
            {paidCount} de {totalCycles}
          </dd>
        </div>
      </dl>

      <div
        className={styles.progress}
        role="progressbar"
        aria-label="Cuotas pagadas"
        aria-valuemin={0}
        aria-valuemax={totalCycles}
        aria-valuenow={paidCount}
      >
        <span style={{ width: `${totalCycles ? Math.min(100, (paidCount / totalCycles) * 100) : 0}%` }} />
      </div>

      {cycles.length > 0 ? (
        <ul className={styles.cycles} aria-label="Cuotas del plan">
          {cycles.map((cycle) => (
            <CycleRow
              key={cycle.cycleId}
              plan={plan}
              cycle={cycle}
              busy={busy}
              activeAction={actionFor(cycle)}
              onPay={(item) => onPay(plan, item)}
              onCertificate={onCertificate}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * Pestaña «Plan Padrino» de «Mis donaciones»: suscripciones del usuario
 * (`GET /donations/sponsor-plans/me`) con sus cuotas. Permite pagar cuotas
 * pendientes o vencidas en Wompi, descargar el certificado de cada cuota
 * pagada (`GET /donations/monetary/:donationId/certificate`) y cancelar el
 * plan activo. El estado siempre lo da el backend.
 * @param {{ reloadKey: number, renderSponsorButton?: () => import("react").ReactNode }} props
 */
export function SponsorPlansPanel({ reloadKey, renderSponsorButton = () => null }) {
  const [data, setData] = useState({ status: "loading", plans: [], error: "" });
  const [retryKey, setRetryKey] = useState(0);
  const [active, setActive] = useState(null);
  const [notice, setNotice] = useState(null);
  const [confirm, setConfirm] = useState({ plan: null, pending: false, error: "" });
  const certificate = useCertificateDownload();
  const toast = useToast();
  const busy = active !== null || confirm.pending || certificate.generating !== null;

  const applyPlans = useCallback((plans) => setData({ status: "ready", plans, error: "" }), []);

  useEffect(() => {
    let cancelled = false;
    fetchPlans()
      .then((plans) => !cancelled && applyPlans(plans))
      .catch((error) => !cancelled && setData({ status: "error", plans: [], error: describeError(error).message }));
    return () => {
      cancelled = true;
    };
  }, [reloadKey, retryKey, applyPlans]);

  // El pago se hace en otra pestaña: al volver a esta, si hay cuotas por pagar, se recarga.
  const hasPayable = data.plans.some((plan) => (plan.cycles ?? []).some((cycle) => isPayable(plan, cycle)));
  useEffect(() => {
    if (!hasPayable) return undefined;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      fetchPlans()
        .then(applyPlans)
        .catch(() => {});
    };
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, [hasPayable, applyPlans]);

  async function reloadQuietly() {
    try {
      const plans = await fetchPlans();
      applyPlans(plans);
      return plans;
    } catch (error) {
      setNotice({ tone: "error", text: `No pudimos actualizar tus planes: ${describeError(error).message}` });
      return null;
    }
  }

  async function payCycle(plan, cycle) {
    if (busy) return;
    // La pestaña se abre en el mismo clic para que el navegador no la bloquee.
    const tab = reserveCheckoutTab();
    setActive({ id: cycle.cycleId, type: "pay" });
    setNotice(null);
    try {
      const { donationId, checkout } = await donationsService.checkoutSponsorCycle(cycle.cycleId);
      if (!checkout?.reference || !isWompiCheckoutUrl(checkout.paymentUrl)) {
        throw new ApiError("El servidor no devolvió un enlace de pago válido.");
      }
      savePaymentSession({
        reference: checkout.reference,
        kind: "donation",
        donationId: String(donationId),
        sponsorPlanId: String(plan.sponsorPlanId),
      });
      const url = checkoutUrlWithReturn(checkout.paymentUrl, checkout.reference);
      if (tab.go(url)) {
        toast.info("Abrimos el pago de la cuota en otra pestaña. Cuando termines, vuelve aquí para ver el estado.");
      } else {
        setNotice({ tone: "info", text: "Tu navegador bloqueó la pestaña de pago.", url });
      }
    } catch (error) {
      tab.close();
      // 409: la cuota ya tiene un pago abierto en Wompi (o dejó de estar por pagar).
      const text =
        error instanceof ApiError && error.status === 409
          ? "Esta cuota ya tiene un pago abierto. Complétalo en la pestaña de Wompi que abriste antes o espera a que el enlace venza para generar uno nuevo."
          : `No pudimos abrir el pago de la cuota: ${describeError(error).message}`;
      setNotice({ tone: "error", text });
      await reloadQuietly();
    } finally {
      setActive(null);
    }
  }

  function downloadCertificate(cycle) {
    if (busy) return;
    setNotice(null);
    certificate.download(
      cycle.cycleId,
      () => donationsService.monetaryCertificate(cycle.donationId),
      `certificado-${cycle.certificateNumber ?? `plan-padrino-cuota-${cycle.cycleNumber}-DON-${cycle.donationId}`}.pdf`,
    );
  }

  function askCancel(plan) {
    if (busy) return;
    setNotice(null);
    setConfirm({ plan, pending: false, error: "" });
  }

  function closeConfirm() {
    if (confirm.pending) return;
    setConfirm({ plan: null, pending: false, error: "" });
  }

  async function cancelPlan() {
    const { plan } = confirm;
    if (confirm.pending || !plan) return;
    setConfirm({ plan, pending: true, error: "" });
    setActive({ id: `plan-${plan.sponsorPlanId}`, type: "cancel" });
    try {
      await donationsService.cancelSponsorPlan(plan.sponsorPlanId);
      setConfirm({ plan: null, pending: false, error: "" });
      toast.success("Cancelaste tu Plan Padrino. No se generarán más cuotas. ¡Gracias por tu apoyo!");
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setConfirm({ plan: null, pending: false, error: "" });
        setNotice({ tone: "error", text: "Este plan ya no estaba activo. Revisa su estado actualizado." });
      } else {
        setConfirm({ plan, pending: false, error: describeError(error).message });
      }
    } finally {
      await reloadQuietly();
      setActive(null);
    }
  }

  const actionFor = (cycle) => {
    if (certificate.generating === cycle.cycleId) return "certificate";
    return active && String(active.id) === String(cycle.cycleId) ? active.type : null;
  };
  const activePlans = data.plans.filter((plan) => plan.status === "ACTIVE");
  const pastPlans = data.plans.filter((plan) => plan.status !== "ACTIVE");
  const renderPlan = (plan) => (
    <PlanCard
      key={plan.sponsorPlanId}
      plan={plan}
      busy={busy}
      actionFor={actionFor}
      cancelling={active?.id === `plan-${plan.sponsorPlanId}`}
      onPay={payCycle}
      onCertificate={downloadCertificate}
      onCancel={askCancel}
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

      {data.status === "loading" ? <ListSkeleton label="Cargando tu Plan Padrino…" rowHeight="14rem" /> : null}
      {data.status === "error" ? <PanelError message={data.error} onRetry={() => setRetryKey((key) => key + 1)} /> : null}

      {data.status === "ready" && data.plans.length === 0 ? (
        <EmptyState
          icon="users"
          tone="brand"
          title="Aún no tienes un Plan Padrino"
          description="Hazte padrino o madrina con un aporte periódico durante un año y acompaña los programas de ASISCO. Cada cuota pagada tiene su certificado."
          actions={renderSponsorButton()}
        />
      ) : null}

      {data.status === "ready" && activePlans.length > 0 ? (
        <section className={rows.section} aria-labelledby="plans-active">
          <div className={rows.sectionHead}>
            <h2 id="plans-active" className={rows.sectionTitle}>
              Plan activo
            </h2>
            <p className={rows.sectionText}>
              Paga cada cuota cuando esté pendiente; las vencidas también se pueden pagar mientras el plan siga
              activo. Cada cuota pagada tiene su certificado.
            </p>
          </div>
          <ul className={styles.list}>{activePlans.map(renderPlan)}</ul>
        </section>
      ) : null}

      {data.status === "ready" && pastPlans.length > 0 ? (
        <section className={rows.section} aria-labelledby="plans-history">
          <div className={rows.sectionHead}>
            <h2 id="plans-history" className={rows.sectionTitle}>
              Planes anteriores
            </h2>
          </div>
          <ul className={styles.list}>{pastPlans.map(renderPlan)}</ul>
        </section>
      ) : null}

      <ConfirmDialog
        open={confirm.plan !== null}
        title="¿Cancelar tu Plan Padrino?"
        confirmLabel="Sí, cancelar plan"
        cancelLabel="Volver"
        pending={confirm.pending}
        error={confirm.error}
        onConfirm={cancelPlan}
        onCancel={closeConfirm}
      >
        {confirm.plan ? (
          <p>
            Se cancelarán el plan de <strong>{formatCop(Number(confirm.plan.amount))}</strong>{" "}
            {frequencyInfo(confirm.plan.frequency).every} y sus cuotas pendientes o vencidas. Las cuotas que ya
            pagaste y sus certificados se conservan.
          </p>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
