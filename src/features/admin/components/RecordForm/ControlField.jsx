import { useState } from "react";

import { Checkbox } from "@/components/ui/Checkbox";
import { Field } from "@/components/ui/Field";

import styles from "./RecordForm.module.css";

/**
 * Selector de imagen con validación inmediata (tipo y tamaño) y vista previa.
 * Un input de archivo no es controlado: se informa el `File` elegido (o `null`).
 */
function FileField({ field, error, currentUrl, onChange }) {
  const [preview, setPreview] = useState(null);
  const [localError, setLocalError] = useState("");

  function showPreview(file) {
    setPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  function handleChange(event) {
    const file = event.target.files?.[0] ?? null;
    const problem = file ? field.validate?.(file) : null;
    if (problem) {
      setLocalError(problem);
      event.target.value = "";
      showPreview(null);
      onChange(null);
      return;
    }
    setLocalError("");
    showPreview(file);
    onChange(file);
  }

  const shown = preview ?? currentUrl ?? null;

  return (
    <div className={styles.file}>
      <Field
        label={field.label}
        type="file"
        accept={field.accept}
        hint={field.hint}
        error={localError || error}
        onChange={handleChange}
      />
      {shown ? (
        <figure className={styles.preview}>
          <img src={shown} alt={preview ? "Vista previa de la imagen elegida" : "Imagen actual del producto"} />
          <figcaption>{preview ? "Imagen elegida" : "Imagen actual"}</figcaption>
        </figure>
      ) : null}
    </div>
  );
}

/**
 * Control de un campo según su `type`.
 * @param {{ field: any, value: any, error?: string, currentUrl?: string | null, onChange: (value: any) => void }} props
 */
export function ControlField({ field, value, error, currentUrl, onChange }) {
  switch (field.type) {
    case "checkbox":
      return (
        <Checkbox
          label={field.label}
          checked={value}
          onChange={(event) => onChange(event.target.checked)}
        />
      );
    case "select":
      return (
        <Field
          as="select"
          label={field.label}
          required={field.required}
          value={value}
          hint={field.hint}
          error={error}
          onChange={(event) => onChange(event.target.value)}
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Field>
      );
    case "file":
      return <FileField field={field} error={error} currentUrl={currentUrl} onChange={onChange} />;
    case "textarea":
      return (
        <Field
          as="textarea"
          label={field.label}
          required={field.required}
          value={value}
          hint={field.hint}
          error={error}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "number":
    case "integer":
      return (
        <Field
          label={field.label}
          type="number"
          inputMode={field.type === "integer" ? "numeric" : "decimal"}
          required={field.required}
          min={field.min}
          step={field.type === "integer" ? 1 : (field.step ?? "any")}
          value={value}
          hint={field.hint}
          error={error}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    default:
      return (
        <Field
          label={field.label}
          type={field.type}
          required={field.required}
          autoComplete={field.type === "password" ? "new-password" : "off"}
          value={value}
          hint={field.hint}
          error={error}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
}
