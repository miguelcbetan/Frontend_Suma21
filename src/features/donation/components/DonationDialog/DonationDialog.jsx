import { useId, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { describeError, donationsService } from "@/core/api";
import { savePaymentSession } from "@/core/utils/paymentSession";
import { PAYMENT_RESULT_PATH, openWompiCheckout } from "@/core/utils/wompiWidget";

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

/**
 * Interfaz de donación monetaria. Con sesión iniciada crea la donación
 * pendiente con `POST /api/v1/donations/monetary` (el backend toma al donante
 * del token) y abre el widget de Wompi con el checkout que devuelve.
 * El nombre y el documento que se piden solo sirven para el certificado de este
 * navegador: no se envían al backend.
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   session?: { authenticated: boolean, userId: string | null, name?: string },
 * }} props
 */
export function DonationDialog({ open, onClose, session = { authenticated: false, userId: null } }) {
  const titleId = useId();
  const navigate = useNavigate();
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [otherAmount, setOtherAmount] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [typedName, setTypedName] = useState(null);
  const [documentNumber, setDocumentNumber] = useState("");
  const [state, setState] = useState({ status: "idle", message: "", fields: {} });

  const canDonate = session.authenticated;
  const donorName = typedName ?? session.name ?? "";
  const value = otherAmount ? Number(customAmount) : amount;
  const validAmount = Number.isFinite(value) && value > 0 && hasValidDecimals(value);
  const pending = state.status === "pending";

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validAmount) {
      setState({ status: "error", message: "Escribe un monto mayor que cero, con máximo dos decimales.", fields: {} });
      return;
    }
    const fields = {};
    if (!donorName.trim()) fields.name = "Este campo es obligatorio.";
    if (!documentNumber.trim()) fields.document = "Este campo es obligatorio.";
    if (Object.keys(fields).length > 0) {
      setState({ status: "error", message: "Completa los datos de tu certificado.", fields });
      return;
    }

    setState({ status: "pending", message: "", fields: {} });
    try {
      const { checkout } = await donationsService.createMonetary({ amount: value });
      const { reference } = checkout;
      savePaymentSession({
        reference,
        kind: "donation",
        ...(session.userId ? { personId: session.userId } : {}),
        donorName: donorName.trim(),
        donorDocument: documentNumber.trim(),
      });
      // El diálogo modal ocupa la capa superior del navegador: se cierra antes de
      // abrir el widget de Wompi para que este quede visible y usable.
      onClose();
      const mode = await openWompiCheckout(checkout, {
        onFinished: () => navigate(`${PAYMENT_RESULT_PATH}?reference=${encodeURIComponent(reference)}`),
      });
      if (mode === "widget") {
        setState({
          status: "waiting",
          message: `Completa el pago en la ventana de Wompi (referencia ${reference}). Si la cerraste sin pagar, puedes consultar el estado en «Mis operaciones».`,
          fields: {},
        });
      }
    } catch (error) {
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
        <p className={styles.eyebrow}>Campaña oficial Semana del Síndrome de Down</p>
        <h2 id={titleId} className={styles.title}>
          Cada aporte transforma vidas:
          <br />
          construyamos inclusión hoy
        </h2>
        <p className={styles.lead}>
          Con tu donación te sumas a los programas de formación laboral, arte, barismo inclusivo y
          autonomía integral de <strong>Asisco</strong> en Colombia.
        </p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <AmountSelector amounts={AMOUNTS} value={amount} onChange={setAmount} />
          <div className={styles.options}>
            <Checkbox
              label="Quiero ingresar otro monto"
              checked={otherAmount}
              onChange={(event) => setOtherAmount(event.target.checked)}
            />
            <Checkbox
              label={
                <span className={styles.gift}>
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                    <path
                      d="M3 8h18v4H3zM5 12h14v8H5zM12 8v12M12 8c-1.5-3.5-5-3.5-5-1.5S10 8 12 8zm0 0c1.5-3.5 5-3.5 5-1.5S14 8 12 8z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Donar como regalo o en homenaje
                </span>
              }
              checked={isGift}
              onChange={(event) => setIsGift(event.target.checked)}
            />
          </div>

          {otherAmount || canDonate ? (
            <div className={styles.extra}>
              {otherAmount ? (
                <Field
                  label="Monto en pesos"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step="0.01"
                  value={customAmount}
                  onChange={(event) => setCustomAmount(event.target.value)}
                />
              ) : null}
              {canDonate ? (
                <>
                  <Field
                    label="Nombre completo"
                    autoComplete="name"
                    required
                    value={donorName}
                    onChange={(event) => setTypedName(event.target.value)}
                    hint="Aparecerá en tu certificado de donación."
                    error={state.fields.name}
                  />
                  <Field
                    label="Número de documento"
                    inputMode="numeric"
                    required
                    value={documentNumber}
                    onChange={(event) => setDocumentNumber(event.target.value)}
                    hint="Solo se usa para generar tu certificado en este navegador."
                    error={state.fields.document}
                  />
                </>
              ) : null}
            </div>
          ) : null}

          {!session.authenticated ? (
            <Alert tone="info" className={styles.alert}>
              Para registrar tu donación{" "}
              <Link to="/login" onClick={onClose} className={styles.link}>
                inicia sesión o crea tu cuenta
              </Link>
              .
            </Alert>
          ) : null}
          {state.status === "error" ? <Alert tone="error" className={styles.alert}>{state.message}</Alert> : null}
          {state.status === "waiting" ? <Alert tone="info" className={styles.alert}>{state.message}</Alert> : null}

          <Button type="submit" size="lg" className={styles.submit} disabled={!canDonate || pending}>
            {pending ? "Preparando el pago…" : `Donar ${validAmount ? formatAmount(value) : ""} ahora`}
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
              <path
                d="M5 12h14M13 6l6 6-6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        </form>

        <SecurityNotice />
      </div>
    </Dialog>
  );
}
