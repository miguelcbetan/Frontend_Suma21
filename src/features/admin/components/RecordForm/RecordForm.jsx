import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { describeError } from "@/core/api";
import { cx } from "@/core/utils/cx";

import { buildBody, initialValues } from "../../formValues.js";

import { ControlField } from "./ControlField.jsx";
import styles from "./RecordForm.module.css";

/**
 * Formulario generado desde la definición de campos de `resources.js`.
 * `onSubmit` recibe el cuerpo ya convertido y debe devolver una promesa; si
 * rechaza con `ApiError`, sus mensajes se muestran en el formulario.
 * @param {{
 *   fields: any[],
 *   initial?: Record<string, any>,
 *   record?: Record<string, any> | null,
 *   submitLabel: string,
 *   onSubmit: (body: Record<string, unknown>) => Promise<void>,
 *   onCancel?: () => void,
 * }} props
 */
export function RecordForm({ fields, initial, record, submitLabel, onSubmit, onCancel }) {
  const [values, setValues] = useState(() => initial ?? initialValues(fields));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  function setValue(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => (current[name] ? { ...current, [name]: undefined } : current));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const { body, errors: localErrors } = buildBody(fields, values);
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      setFormError("Revisa los campos marcados.");
      return;
    }

    setPending(true);
    setErrors({});
    setFormError("");
    try {
      await onSubmit(body);
    } catch (caught) {
      const { message, fields: serverFields } = describeError(caught);
      const known = new Set(fields.map((field) => field.name));
      const matched = Object.fromEntries(Object.entries(serverFields).filter(([name]) => known.has(name)));
      const extra = Object.entries(serverFields)
        .filter(([name]) => !known.has(name))
        .map(([name, text]) => `${name}: ${text}`);
      setErrors(matched);
      setFormError([message, ...extra].join(" · "));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={styles.form}>
      {formError ? <Alert tone="error">{formError}</Alert> : null}
      <div className={styles.grid}>
        {fields.map((field) => (
          <div key={field.name} className={cx(field.full && styles.full)}>
            <ControlField
              field={field}
              value={values[field.name]}
              error={errors[field.name]}
              currentUrl={field.type === "file" ? (record?.image_url ?? null) : undefined}
              onChange={(value) => setValue(field.name, value)}
            />
          </div>
        ))}
      </div>
      <div className={styles.footer}>
        <p className={styles.legend}>Los campos con * son obligatorios.</p>
        <div className={styles.actions}>
          {onCancel ? (
            <Button variant="outline" onClick={onCancel} disabled={pending}>
              Cancelar
            </Button>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
