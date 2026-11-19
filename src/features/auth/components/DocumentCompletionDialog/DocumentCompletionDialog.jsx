import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { describeError } from "@/core/api";
import { DOCUMENT_NUMBER_HINT, DOCUMENT_TYPES } from "@/core/utils/documentTypes";

import { useAuth } from "../../context/useAuth.js";
import { needsDocumentCompletion } from "../../session.js";

import styles from "./DocumentCompletionDialog.module.css";

const TITLE_ID = "document-completion-title";


const REQUIRED_MESSAGES = {
  full_name: "Escribe tu nombre completo o la razón social.",
  document_type: "Selecciona el tipo de documento.",
  document_number: "Escribe el número de documento.",
};

const EMPTY_ERROR = { message: "", fields: {} };

/**
 * Verificación obligatoria tras iniciar sesión cuando el backend responde
 * `requiresDocumentCompletion: true`. Bloquea el portal (no se puede cerrar)
 * hasta registrar nombre, tipo y número de documento con
 * `POST /auth/complete-document`, o hasta cerrar sesión. La sesión y el token
 * se conservan.
 */
export function DocumentCompletionDialog() {
  const { status, user, completeDocument, logout } = useAuth();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(EMPTY_ERROR);

  const open = status === "authenticated" && needsDocumentCompletion(user);
  if (!open) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = {
      full_name: String(form.get("full_name") ?? "").trim(),
      document_type: String(form.get("document_type") ?? ""),
      document_number: String(form.get("document_number") ?? "").trim(),
    };

    const missing = Object.fromEntries(
      Object.entries(values)
        .filter(([, value]) => !value)
        .map(([key]) => [key, REQUIRED_MESSAGES[key]]),
    );
    if (Object.keys(missing).length > 0) {
      setError({ message: "Completa los campos obligatorios.", fields: missing });
      return;
    }

    setPending(true);
    setError(EMPTY_ERROR);
    try {
      await completeDocument({
        fullName: values.full_name,
        documentType: values.document_type,
        documentNumber: values.document_number,
      });
      toast.success("Tu información quedó verificada. Ya puedes comprar y donar.");
    } catch (caught) {
      setError(describeError(caught));
      setPending(false);
    }
  }

  return (
    <Dialog open closable={false} labelledBy={TITLE_ID} className={styles.dialog}>
      <div className={styles.content}>
        <h2 id={TITLE_ID}>Completa tu información</h2>
        <p className={styles.description}>
          Para comprar y realizar donaciones necesitamos verificar tu identidad. Esta información se vinculará
          de forma segura a tu cuenta y se usará en tus certificados de donación.
        </p>
        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          {error.message ? <Alert tone="error">{error.message}</Alert> : null}
          <Field
            label="Nombre completo o razón social"
            name="full_name"
            autoComplete="name"
            required
            disabled={pending}
            error={error.fields.full_name}
          />
          <Field
            label="Tipo de documento"
            name="document_type"
            as="select"
            required
            disabled={pending}
            defaultValue=""
            error={error.fields.document_type}
          >
            <option value="" disabled>
              Selecciona una opción
            </option>
            {DOCUMENT_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Field>
          <Field
            label="Número de documento"
            name="document_number"
            hint={DOCUMENT_NUMBER_HINT}
            autoComplete="off"
            required
            disabled={pending}
            error={error.fields.document_number}
          />
          <Button type="submit" size="lg" block disabled={pending}>
            {pending ? "Guardando información…" : "Continuar"}
          </Button>
          <Button variant="ghost" block disabled={pending} onClick={logout}>
            Cerrar sesión
          </Button>
        </form>
      </div>
    </Dialog>
  );
}
