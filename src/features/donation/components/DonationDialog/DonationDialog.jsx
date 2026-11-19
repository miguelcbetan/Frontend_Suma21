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
import {
  checkoutUrlWithReturn,
  isWompiCheckoutUrl,
  reserveCheckoutTab,
} from "@/core/utils/wompiWidget";

import { AmountSelector } from "../AmountSelector";
import { SecurityNotice } from "../SecurityNotice";

import styles from "./DonationDialog.module.css";

const AMOUNTS = [
  { value: 50000, label: "$50.000" },
  { value: 70000, label: "$70.000" },
  { value: 90000, label: "$90.000" },
];

const DEFAULT_AMOUNT = 70000;

const formatAmount = (value) => `$${value.toLocaleString("es-CO")}`;

/** Pesos con máximo dos decimales (lo que acepta `POST /donations/monetary`). */
const hasValidDecimals = (value) => Math.round(value * 100) === value * 100;

/*
 * PENDIENTE DE CONTENIDO: la opción «Donar como regalo o en homenaje» se ocultó
 * porque no tenía efecto (el backend no recibe ese dato). Confirmar la vigencia
 * del texto «Campaña oficial Semana del Síndrome de Down» y de los montos sugeridos.
 */

/**
 * Interfaz de donación monetaria. Con sesión iniciada crea la donación
 * pendiente con `POST /api/v1/donations/monetary` (el backend toma al donante
 * del token) y abre en una pestaña nueva el enlace de pago de Wompi que
 * devuelve (`checkout.paymentUrl`), igual que la tienda; esta pestaña sigue en
 * SUMA21. Solo se
 * pide el monto: el nombre y el documento del certificado los tiene el backend
 * desde la verificación obligatoria tras el login.
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   session?: { authenticated: boolean, userId: string | null, name?: string },
 * }} props
 */
export function DonationDialog({ open, onClose, session = { authenticated: false, userId: null } }) {
  const titleId = useId();
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [otherAmount, setOtherAmount] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [state, setState] = useState({ status: "idle", message: "", fields: {} });

  const canDonate = session.authenticated;
  const value = otherAmount ? Number(customAmount) : amount;
  const validAmount = Number.isFinite(value) && value > 0 && hasValidDecimals(value);
  const pending = state.status === "pending";

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validAmount) {
      setState({ status: "error", message: "Escribe un monto mayor que cero, con máximo dos decimales.", fields: {} });
      return;
    }

    // La pestaña se abre en el mismo clic para que el navegador no la bloquee.
    const tab = reserveCheckoutTab();
    setState({ status: "pending", message: "", fields: {} });
    try {
      const { donationId, checkout } = await donationsService.createMonetary({ amount: value });
      const { reference } = checkout;
      savePaymentSession({
        reference,
        kind: "donation",
        donationId: String(donationId),
        ...(session.userId ? { personId: session.userId } : {}),
      });
      if (!isWompiCheckoutUrl(checkout.paymentUrl)) {
        throw new ApiError(
          "Tu donación quedó registrada, pero no recibimos el enlace de pago. Continúa el pago desde Mis donaciones.",
        );
      }
      const url = checkoutUrlWithReturn(checkout.paymentUrl, reference);
      setState({ status: tab.go(url) ? "waiting" : "blocked", reference, url, message: "", fields: {} });
    } catch (error) {
      tab.close();
      setState({ status: "error", ...describeError(error) });
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      variant="fullscreen"
      closeLabel="Cerrar donación"
      className={styles.dialog}
    >
      <div className={styles.content}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Campaña oficial Semana del Síndrome de Down</p>
          <h2 id={titleId} className={styles.title}>
            Cada aporte transforma vidas: construyamos inclusión hoy
          </h2>
          <p className={styles.lead}>
            Con tu donación te sumas a los programas de formación laboral, arte, barismo inclusivo y
            autonomía integral de <strong>ASISCO</strong> en Colombia.
          </p>
          <SecurityNotice />
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.formHeader}>
            <h3 className={styles.formTitle}>Elige tu aporte</h3>
            <p className={styles.formHint}>Montos en pesos colombianos (COP).</p>
          </div>

          <AmountSelector amounts={AMOUNTS} value={otherAmount ? null : amount} onChange={(next) => {
            setAmount(next);
            setOtherAmount(false);
          }} />
          <Checkbox
            label="Quiero ingresar otro monto"
            checked={otherAmount}
            onChange={(event) => setOtherAmount(event.target.checked)}
          />

          {otherAmount ? (
            <Field
              label="Monto en pesos"
              type="number"
              inputMode="numeric"
              min={1}
              step="0.01"
              placeholder="Ej.: 40000"
              value={customAmount}
              onChange={(event) => setCustomAmount(event.target.value)}
            />
          ) : null}

          {!session.authenticated ? (
            <Alert tone="info">
              Para registrar tu donación{" "}
              <Link to="/login" onClick={onClose}>
                inicia sesión o crea tu cuenta
              </Link>
              .
            </Alert>
          ) : null}
          {state.status === "error" ? <Alert tone="error">{state.message}</Alert> : null}
          {state.status === "waiting" ? (
            <Alert tone="info">
              Abrimos Wompi en una pestaña nueva para que completes el pago. Cuando termines, revisa el estado de tu
              donación y descarga tu certificado en{" "}
              <Link to="/mis-donaciones" onClick={onClose}>
                Mis donaciones
              </Link>
              .
            </Alert>
          ) : null}
          {state.status === "blocked" ? (
            <Alert tone="info">
              Tu navegador bloqueó la pestaña de pago.{" "}
              <a href={state.url} target="_blank" rel="noopener noreferrer">
                Abrir el pago en Wompi
              </a>
            </Alert>
          ) : null}

          <Button type="submit" size="lg" block disabled={!canDonate || pending}>
            {pending ? "Preparando el pago…" : `Donar ${validAmount ? formatAmount(value) : ""} ahora`}
            <Icon name="arrowRight" size={20} />
          </Button>
        </form>
      </div>
    </Dialog>
  );
}
