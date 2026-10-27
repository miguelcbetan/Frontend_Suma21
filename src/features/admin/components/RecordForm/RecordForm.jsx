import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { describeError } from "@/core/api";

import { buildBody, emptyRow, initialValues } from "../../formValues.js";

import { ControlField } from "./ControlField.jsx";
import styles from "./RecordForm.module.css";

/** Filas repetibles (productos de una venta, artículos de una donación…). */
function ItemsField({ field, rows, error, onChange }) {
  function setRowValue(index, name, value) {
    onChange(rows.map((row, i) => (i === index ? { ...row, [name]: value } : row)));
  }

  return (
    <fieldset className={styles.items}>
      <legend>
        {field.label}
        <span aria-hidden="true"> *</span>
      </legend>
      {rows.map((row, index) => (
        <div key={index} className={styles.row}>
          <div className={styles.rowFields}>
            {field.itemFields.map((sub) => (
              <ControlField
                key={sub.name}
                field={sub}
                value={row[sub.name]}
                onChange={(value) => setRowValue(index, sub.name, value)}
              />
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={rows.length === 1}
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
          >
            Quitar {field.itemLabel} {index + 1}
          </Button>
        </div>
      ))}
      {error ? <p className={styles.itemsError}>{error}</p> : null}
      <Button variant="secondary" size="sm" onClick={() => onChange([...rows, emptyRow(field)])}>
        Agregar {field.itemLabel}
      </Button>
    </fieldset>
  );
}

/**
 * Formulario generado desde la definición de campos de `resources.js`.
 * `onSubmit` recibe el cuerpo ya convertido y debe devolver una promesa; si
 * rechaza con `ApiError`, sus mensajes se muestran en el formulario.
 * @param {{
 *   fields: any[],
 *   initial?: Record<string, any>,
 *   submitLabel: string,
 *   onSubmit: (body: Record<string, unknown>) => Promise<void>,
 *   onCancel?: () => void,
 * }} props
 */
export function RecordForm({ fields, initial, submitLabel, onSubmit, onCancel }) {
  const [values, setValues] = useState(() => initial ?? initialValues(fields));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  function setValue(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const { body, errors: localErrors } = buildBody(fields, values);
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      setFormError("Revisa los datos del formulario.");
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
        {fields.map((field) =>
          field.type === "items" ? (
            <ItemsField
              key={field.name}
              field={field}
              rows={values[field.name]}
              error={errors[field.name]}
              onChange={(rows) => setValue(field.name, rows)}
            />
          ) : (
            <ControlField
              key={field.name}
              field={field}
              value={values[field.name]}
              error={errors[field.name]}
              onChange={(value) => setValue(field.name, value)}
            />
          ),
        )}
      </div>
      <div className={styles.actions}>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
