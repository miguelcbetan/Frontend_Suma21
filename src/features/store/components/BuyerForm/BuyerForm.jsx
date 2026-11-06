import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { describeError } from "@/core/api";

import styles from "./BuyerForm.module.css";

/**
 * Datos del comprador. El backend registra la venta a nombre de un cliente, así
 * que se piden antes de pasar al pago.
 * @param {{
 *   onSubmit: (buyer: { name: string, document_number: string, email: string }) => Promise<void>,
 *   onCancel: () => void,
 * }} props
 */
export function BuyerForm({ onSubmit, onCancel }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState({ message: "", fields: {} });

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const buyer = {
      name: String(form.get("name")).trim(),
      document_number: String(form.get("document_number")).trim(),
      email: String(form.get("email")).trim(),
    };

    const fields = {};
    if (!buyer.name) fields.name = "Este campo es obligatorio.";
    if (!buyer.document_number) fields.document_number = "Este campo es obligatorio.";
    if (Object.keys(fields).length > 0) {
      setError({ message: "", fields });
      return;
    }

    setPending(true);
    setError({ message: "", fields: {} });
    try {
      await onSubmit(buyer);
    } catch (caught) {
      setError(describeError(caught));
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h3 className={styles.heading}>Tus datos</h3>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          {error.message ? <Alert tone="error">{error.message}</Alert> : null}
          <Field label="Nombre completo" name="name" autoComplete="name" required error={error.fields.name} />
          <Field
            label="Número de documento"
            name="document_number"
            inputMode="numeric"
            required
            error={error.fields.document_number}
          />
          <Field label="Correo electrónico" name="email" type="email" autoComplete="email" />
          <div className={styles.actions}>
            <Button type="submit" disabled={pending}>
              {pending ? "Preparando el pago…" : "Ir a pagar"}
            </Button>
            <Button variant="ghost" onClick={onCancel} disabled={pending}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
