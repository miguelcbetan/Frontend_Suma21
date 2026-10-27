import { Checkbox } from "@/components/ui/Checkbox";
import { Field } from "@/components/ui/Field";

import { useRefOptions } from "./useRefOptions.js";

function RefField({ field, value, error, onChange }) {
  const { status, options } = useRefOptions(field.source);

  // Sin lista (error o vacía) se permite escribir el ID a mano.
  if (status !== "ready" || options.length === 0) {
    return (
      <Field
        label={field.label}
        type="text"
        inputMode="numeric"
        required={field.required}
        value={value}
        hint={status === "loading" ? "Cargando opciones…" : "No hay lista disponible: escribe el ID."}
        error={error}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <Field
      as="select"
      label={field.label}
      required={field.required}
      value={value}
      error={error}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Selecciona…</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Field>
  );
}

/**
 * Control de un campo según su `type`.
 * @param {{ field: any, value: any, error?: string, onChange: (value: any) => void }} props
 */
export function ControlField({ field, value, error, onChange }) {
  switch (field.type) {
    case "ref":
      return <RefField field={field} value={value} error={error} onChange={onChange} />;
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
    case "textarea":
      return (
        <Field
          as="textarea"
          label={field.label}
          required={field.required}
          value={value}
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
