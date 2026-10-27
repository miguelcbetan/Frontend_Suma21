import { useId, useState } from "react";
import { Link } from "react-router-dom";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { describeError, donationsService } from "@/core/api";
import { todayISO } from "@/core/utils/date";

import { AmountSelector } from "../AmountSelector";
import { FrequencyToggle } from "../FrequencyToggle";
import { SecurityNotice } from "../SecurityNotice";

import styles from "./DonationDialog.module.css";
import { useDonationOptions } from "./useDonationOptions.js";

const AMOUNTS = [
  { value: 50000, label: "$50.000" },
  { value: 70000, label: "$70.000" },
  { value: 90000, label: "$90.000" },
];

const DEFAULT_AMOUNT = 70000;

/**
 * Interfaz de donación. Con sesión de donante envía `POST /api/donations/monetary`;
 * sin sesión invita a iniciarla.
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   session?: { authenticated: boolean, donorId: string | null },
 * }} props
 */
export function DonationDialog({ open, onClose, session = { authenticated: false, donorId: null } }) {
  const titleId = useId();
  const [frequency, setFrequency] = useState("monthly");
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [otherAmount, setOtherAmount] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [state, setState] = useState({ status: "idle", message: "" });

  const options = useDonationOptions(open && session.authenticated);
  const selectedPaymentMethod = paymentMethodId || String(options.paymentMethods[0]?.id ?? "");
  const selectedAccount = accountId || String(options.accounts[0]?.id ?? "");

  async function handleSubmit(event) {
    event.preventDefault();
    const value = otherAmount ? Number(customAmount) : amount;

    if (!Number.isFinite(value) || value <= 0) {
      setState({ status: "error", message: "Escribe un monto mayor que cero." });
      return;
    }
    if (!session.donorId) {
      setState({
        status: "error",
        message: "Tu cuenta todavía no está vinculada a un donante. Contacta a ASISCO para completarla.",
      });
      return;
    }
    if (!selectedPaymentMethod || !selectedAccount) {
      setState({ status: "error", message: "No hay métodos de pago o cuentas disponibles para registrar la donación." });
      return;
    }

    setState({ status: "pending", message: "" });
    try {
      await donationsService.createMonetary({
        donor_id: session.donorId,
        payment_method_id: selectedPaymentMethod,
        account_id: selectedAccount,
        amount: value,
        txn_date: todayISO(),
        certificate_issued: false,
        ...(frequency === "monthly" ? { frequency: 1 } : {}),
      });
      setState({ status: "success", message: "¡Gracias! Tu donación quedó registrada." });
    } catch (error) {
      setState({ status: "error", message: describeError(error).message });
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
          Cada aporte transforma vidas: construyamos inclusión hoy
        </h2>
        <p className={styles.lead}>
          Con tu donación te sumas a los programas de formación laboral, arte, barismo inclusivo y
          autonomía integral de <strong>Asisco</strong> en Colombia. Tu generosidad garantiza que
          más jóvenes con síndrome de Down conquisten sus sueños.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <FrequencyToggle value={frequency} onChange={setFrequency} />
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

          {otherAmount || session.authenticated ? (
            <div className={styles.extra}>
              {otherAmount ? (
                <Field
                  label="Monto en pesos"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={customAmount}
                  onChange={(event) => setCustomAmount(event.target.value)}
                />
              ) : null}
              {session.authenticated && options.status === "ready" ? (
                <>
                  <Field
                    as="select"
                    label="Método de pago"
                    value={selectedPaymentMethod}
                    onChange={(event) => setPaymentMethodId(event.target.value)}
                  >
                    {options.paymentMethods.map((method) => (
                      <option key={method.id} value={String(method.id)}>
                        {method.name}
                      </option>
                    ))}
                  </Field>
                  <Field
                    as="select"
                    label="Cuenta destino"
                    value={selectedAccount}
                    onChange={(event) => setAccountId(event.target.value)}
                  >
                    {options.accounts.map((account) => (
                      <option key={account.id} value={String(account.id)}>
                        {account.name}
                      </option>
                    ))}
                  </Field>
                </>
              ) : null}
              {session.authenticated && options.status === "loading" ? (
                <p role="status">Cargando métodos de pago…</p>
              ) : null}
              {session.authenticated && options.status === "error" ? (
                <Alert tone="error">No se pudieron cargar los métodos de pago. Inténtalo más tarde.</Alert>
              ) : null}
            </div>
          ) : null}

          {!session.authenticated ? (
            <Alert tone="info" className={styles.alert}>
              Para registrar tu donación{" "}
              <Link to="/login" onClick={onClose} className={styles.link}>
                inicia sesión o crea tu cuenta de donante
              </Link>
              .
            </Alert>
          ) : null}
          {state.status === "error" ? <Alert tone="error" className={styles.alert}>{state.message}</Alert> : null}
          {state.status === "success" ? <Alert tone="success" className={styles.alert}>{state.message}</Alert> : null}

          <Button
            type="submit"
            size="lg"
            className={styles.submit}
            disabled={!session.authenticated || state.status === "pending"}
          >
            {state.status === "pending" ? "Procesando…" : "Donar ahora"}
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
