import { useId, useState } from "react";
import { Link } from "react-router-dom";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { ApiError, describeError, donationsService } from "@/core/api";
import { savePaymentSession } from "@/core/utils/paymentSession";
import { PAYABLE_CYCLE_STATUSES, SPONSOR_FREQUENCIES, formatPesos } from "@/core/utils/sponsorPlan";
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
  const frequencyName = useId();
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [otherAmount, setOtherAmount] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [frequency, setFrequency] = useState("MONTHLY");
  const [state, setState] = useState(IDLE);

  const value = otherAmount ? Number(customAmount) : amount;
  const validAmount = Number.isFinite(value) && value > 0 && hasValidDecimals(value);
  const pending = state.status === "pending";
  const plan = SPONSOR_FREQUENCIES[frequency];

  async function handleSubmit(event) {
    event.preventDefault();
    if (!session.authenticated || pending) return;
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

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.formHeader}>
            <h3 className={styles.formTitle}>Arma tu plan</h3>
            <p className={styles.formHint}>Monto por cuota en pesos colombianos (COP).</p>
          </div>

          <fieldset className={styles.frequency}>
            <legend className={styles.legend}>¿Cada cuánto quieres aportar?</legend>
            <div className={styles.frequencyGrid}>
              {Object.entries(SPONSOR_FREQUENCIES).map(([key, info]) => (
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

          {validAmount ? (
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
          {state.status === "hasPlan" ? (
            <Alert tone="info">
              Ya tienes un Plan Padrino activo. Puedes ver sus cuotas y pagarlas en{" "}
              <Link to={MY_PLANS_PATH} onClick={onClose}>
                Mis donaciones
              </Link>
              .
            </Alert>
          ) : null}
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

          <Button type="submit" size="lg" block disabled={!session.authenticated || pending}>
            {pending
              ? "Preparando tu plan…"
              : `Ser padrino con ${validAmount ? formatPesos(value) : ""} ${plan.every}`}
            <Icon name="heart" size={20} />
          </Button>
        </form>
      </div>
    </Dialog>
  );
}
