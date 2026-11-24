import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";

import { Alert } from "@/components/ui/Alert";
import { Button, buttonClassName } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { ApiError, describeError, donationsService } from "@/core/api";
import { savePaymentSession } from "@/core/utils/paymentSession";
import {
  PAYABLE_CYCLE_STATUSES,
  SPONSOR_FREQUENCIES,
  formatPesos,
  formatPlanDate,
  frequencyInfo,
} from "@/core/utils/sponsorPlan";
import { checkoutUrlWithReturn, isWompiCheckoutUrl, reserveCheckoutTab } from "@/core/utils/wompiWidget";

import { AmountSelector } from "../AmountSelector";
import { SecurityNotice } from "../SecurityNotice";

import styles from "./SponsorDialog.module.css";

const AMOUNTS = [
  { value: 30000, label: "$30.000" },
  { value: 50000, label: "$50.000" },
  { value: 100000, label: "$100.000" },
];

const DEFAULT_AMOUNT = 50000;
const MY_PLANS_PATH = "/mis-donaciones?tipo=plan-padrino";

/** Pesos con máximo dos decimales. */
const hasValidDecimals = (value) => Math.round(value * 100) === value * 100;

const IDLE = { status: "idle", message: "" };

function describeActivePlan(plan) {
  if (!plan) return "";
  const amountText = Number.isFinite(Number(plan.amount)) ? formatPesos(Number(plan.amount)) : "";
  const freqText = plan.frequency ? frequencyInfo(plan.frequency).label.toLowerCase() : "";
  const endText = plan.endDate ? `vigente hasta ${formatPlanDate(plan.endDate)}` : "";
  return [amountText && freqText ? `${amountText} (${freqText})` : amountText || freqText, endText]
    .filter(Boolean)
    .join(" · ");
}

function SponsorDialogForm({ onClose, session }) {
  const frequencyName = useId();
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [otherAmount, setOtherAmount] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [frequency, setFrequency] = useState("MONTHLY");
  const [state, setState] = useState(IDLE);
  const [planCheck, setPlanCheck] = useState(() => ({
    status: session.authenticated ? "checking" : "none",
    plan: null,
  }));

  useEffect(() => {
    if (!session.authenticated) return undefined;
    let cancelled = false;
    donationsService
      .listSponsorPlans()
      .then((payload) => {
        if (cancelled) return;
        const active = Array.isArray(payload) ? payload.find((item) => item?.status === "ACTIVE") ?? null : null;
        setPlanCheck({ status: active ? "active" : "none", plan: active });
      })
      .catch(() => {
        if (!cancelled) setPlanCheck({ status: "none", plan: null });
      });
    return () => {
      cancelled = true;
    };
  }, [session.authenticated]);

  const value = otherAmount ? Number(customAmount) : amount;
  const validAmount = Number.isFinite(value) && value > 0 && hasValidDecimals(value);
  const pending = state.status === "pending";
  const checkingPlan = session.authenticated && planCheck.status === "checking";
  const hasActivePlan = planCheck.status === "active" || state.status === "hasPlan";
  const activePlanSummary = describeActivePlan(planCheck.plan);
  const plan = SPONSOR_FREQUENCIES[frequency];

  async function handleSubmit(event) {
    event.preventDefault();
    if (!session.authenticated || pending || checkingPlan || hasActivePlan) return;
    if (!validAmount) {
      setState({ status: "error", message: "Escribe un monto mayor que cero, con máximo dos decimales." });
      return;
    }

    // La pestaña se abre en el mismo clic para que el navegador no la bloquee.
    const tab = reserveCheckoutTab();
    setState({ status: "pending", message: "" });

    let created;
    try {
      created = await donationsService.createSponsorPlan({ amount: value, frequency });
    } catch (error) {
      tab.close();
      if (error instanceof ApiError && error.status === 409) {
        setState({ status: "hasPlan", message: "" });
      } else {
        setState({ status: "error", message: describeError(error).message });
      }
      return;
    }

    // El plan ya existe: si el pago de la primera cuota falla, se continúa desde «Mis donaciones».
    try {
      const cycle = (created?.cycles ?? []).find((item) => PAYABLE_CYCLE_STATUSES.includes(item.status));
      if (!cycle) throw new ApiError("El plan no tiene una cuota pendiente de pago.");
      const { donationId, checkout } = await donationsService.checkoutSponsorCycle(cycle.cycleId);
      if (!checkout?.reference || !isWompiCheckoutUrl(checkout.paymentUrl)) {
        throw new ApiError("El servidor no devolvió un enlace de pago válido.");
      }
      savePaymentSession({
        reference: checkout.reference,
        kind: "donation",
        donationId: String(donationId),
        sponsorPlanId: String(created.sponsorPlanId),
        ...(session.userId ? { personId: session.userId } : {}),
      });
      const url = checkoutUrlWithReturn(checkout.paymentUrl, checkout.reference);
      setState({ status: tab.go(url) ? "waiting" : "blocked", url, message: "" });
    } catch (error) {
      tab.close();
      setState({ status: "createdUnpaid", message: describeError(error).message });
    }
  }

  let submitLabel = `Ser padrino con ${validAmount ? formatPesos(value) : ""} ${plan.every}`;
  if (checkingPlan) submitLabel = "Verificando tu plan…";
  else if (hasActivePlan) submitLabel = "Ya tienes un Plan Padrino activo";
  else if (pending) submitLabel = "Preparando tu plan…";

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.formHeader}>
        <h3 className={styles.formTitle}>Arma tu plan</h3>
        <p className={styles.formHint}>Monto por cuota en pesos colombianos (COP).</p>
      </div>

      {hasActivePlan ? (
        <Alert tone="warning">
          <div className={styles.activePlanAlert}>
            <p>
              <strong>Ya tienes un Plan Padrino activo</strong>
              {activePlanSummary ? ` (${activePlanSummary})` : ""}. Solo puedes tener un plan activo a la vez; para
              pagar tus cuotas o cancelarlo, entra a Mis donaciones.
            </p>
            <Link to={MY_PLANS_PATH} className={buttonClassName({ variant: "outline", size: "sm" })} onClick={onClose}>
              Ir a mi Plan Padrino
            </Link>
          </div>
        </Alert>
      ) : null}

      <fieldset className={styles.fieldsLock} disabled={hasActivePlan || pending}>
        <fieldset className={styles.frequency}>
          <legend className={styles.legend}>¿Cada cuánto quieres aportar?</legend>
          <div className={styles.frequencyGrid}>
            {Object.entries(SPONSOR_FREQUENCIES)
              .filter(([key]) => key !== "ANNUAL")
              .map(([key, info]) => (
              <label key={key} className={styles.frequencyTile}>
                <input
                  type="radio"
                  name={frequencyName}
                  value={key}
                  checked={frequency === key}
                  onChange={() => setFrequency(key)}
                  className={styles.frequencyInput}
                />
                <span className={styles.frequencyText}>
                  {info.label}
                  <small>
                    {info.cycles} {info.cycles === 1 ? "cuota" : "cuotas"}
                  </small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <AmountSelector
          amounts={AMOUNTS}
          value={otherAmount ? null : amount}
          onChange={(next) => {
            setAmount(next);
            setOtherAmount(false);
          }}
        />
        <Checkbox
          label="Quiero ingresar otro monto"
          checked={otherAmount}
          disabled={hasActivePlan || pending}
          onChange={(event) => setOtherAmount(event.target.checked)}
        />
        {otherAmount ? (
          <Field
            label="Monto por cuota en pesos"
            type="number"
            inputMode="numeric"
            min={1}
            step="0.01"
            placeholder="Ej.: 40000"
            value={customAmount}
            onChange={(event) => setCustomAmount(event.target.value)}
          />
        ) : null}
      </fieldset>

      {!hasActivePlan && validAmount ? (
        <p className={styles.summary}>
          Aportarás <strong>{formatPesos(value)}</strong> {plan.every} durante un año
          {plan.cycles > 1 ? (
            <>
              {" "}
              ({plan.cycles} cuotas, <strong>{formatPesos(value * plan.cycles)}</strong> en total)
            </>
          ) : null}
          . Hoy pagas la primera cuota.
        </p>
      ) : null}

      {!session.authenticated ? (
        <Alert tone="info">
          Para hacerte padrino{" "}
          <Link to="/login" onClick={onClose}>
            inicia sesión o crea tu cuenta
          </Link>
          .
        </Alert>
      ) : null}
      {state.status === "error" ? <Alert tone="error">{state.message}</Alert> : null}
      {state.status === "createdUnpaid" ? (
        <Alert tone="error">
          Tu plan quedó creado, pero no pudimos abrir el pago de la primera cuota ({state.message}). Págala desde{" "}
          <Link to={MY_PLANS_PATH} onClick={onClose}>
            Mis donaciones
          </Link>
          .
        </Alert>
      ) : null}
      {state.status === "waiting" ? (
        <Alert tone="success">
          ¡Gracias por sumarte! Abrimos Wompi en una pestaña nueva para pagar tu primera cuota. Cuando termines,
          revisa tu plan, tus cuotas y tus certificados en{" "}
          <Link to={MY_PLANS_PATH} onClick={onClose}>
            Mis donaciones
          </Link>
          .
        </Alert>
      ) : null}
      {state.status === "blocked" ? (
        <Alert tone="info">
          Tu plan quedó creado, pero el navegador bloqueó la pestaña de pago.{" "}
          <a href={state.url} target="_blank" rel="noopener noreferrer">
            Pagar la primera cuota en Wompi
          </a>
        </Alert>
      ) : null}

      <Button type="submit" size="lg" block disabled={!session.authenticated || pending || checkingPlan || hasActivePlan}>
        {submitLabel}
        <Icon name="heart" size={20} />
      </Button>
    </form>
  );
}

/**
 * Suscripción al Plan Padrino: el donante elige monto por cuota y
 * periodicidad, se crea el plan (`POST /donations/sponsor-plans`) y se paga su
 * primera cuota (`POST /donations/sponsor-plans/cycles/:id/checkout`) en una
 * pestaña nueva de Wompi, igual que las donaciones. Las cuotas siguientes se
 * pagan desde «Mis donaciones», pestaña Plan Padrino.
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   session?: { authenticated: boolean, userId: string | null },
 * }} props
 */
export function SponsorDialog({ open, onClose, session = { authenticated: false, userId: null } }) {
  const titleId = useId();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      variant="fullscreen"
      closeLabel="Cerrar Plan Padrino"
      className={styles.dialog}
    >
      <div className={styles.content}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Plan Padrino · Compromiso de un año</p>
          <h2 id={titleId} className={styles.title}>
            Hazte padrino o madrina y acompaña su proceso todo el año
          </h2>
          <p className={styles.lead}>
            Con un aporte periódico durante 12 meses das estabilidad a los programas de formación laboral, arte,
            barismo inclusivo y autonomía de <strong>ASISCO</strong>.
          </p>
          <ul className={styles.benefits}>
            <li>
              <Icon name="mail" size={18} />
              Te avisamos por correo cuando tengas una cuota por pagar.
            </li>
            <li>
              <Icon name="receipt" size={18} />
              Certificado de donación por cada cuota pagada.
            </li>
            <li>
              <Icon name="check" size={18} />
              Puedes cancelar el plan cuando quieras desde «Mis donaciones».
            </li>
          </ul>
          <SecurityNotice />
        </div>

        {open ? <SponsorDialogForm key={session.userId ?? "guest"} onClose={onClose} session={session} /> : null}
      </div>
    </Dialog>
  );
}
