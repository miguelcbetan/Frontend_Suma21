import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { cx } from "@/core/utils/cx";

import styles from "./RecordForm.module.css";

/**
 * Selector de imagen con validación inmediata (tipo y tamaño) y vista previa
 * dentro de una zona visual limpia.
 */
function FileField({ field, value, error, currentUrl, onChange }) {
  const id = useId();
  const inputRef = useRef(null);
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

  function handleClear() {
    if (inputRef.current) inputRef.current.value = "";
    setLocalError("");
    showPreview(null);
    onChange(null);
  }

  const shown = preview ?? currentUrl ?? null;
  const displayError = localError || error;
  const statusText = value?.name
    ? `Imagen seleccionada: ${value.name}`
    : currentUrl
      ? "Imagen actual guardada en el catálogo"
      : "Sube una fotografía clara del producto";

  return (
    <div className={styles.file}>
      <span className={styles.fileLabel}>{field.label}</span>
      <div className={cx(styles.fileBox, displayError && styles.fileBoxError)}>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={field.accept}
          className={styles.fileInput}
          onChange={handleChange}
        />
        <div className={styles.thumb}>
          {shown ? (
            <img src={shown} alt={preview ? "Vista previa de la imagen elegida" : "Imagen actual del producto"} />
          ) : (
            <Icon name="bag" size={26} />
          )}
        </div>
        <div className={styles.fileMeta}>
          <p className={styles.fileName}>{statusText}</p>
          {field.hint ? <p className={styles.fileHint}>{field.hint}</p> : null}
        </div>
        <div className={styles.fileActions}>
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            {shown ? "Cambiar imagen" : "Elegir imagen"}
          </Button>
          {preview ? (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Quitar
            </Button>
          ) : null}
        </div>
      </div>
      {displayError ? <p className={styles.fileError}>{displayError}</p> : null}
    </div>
  );
}

/** Tarjeta interactiva accesible (`role="switch"`) para campos booleanos (`is_needed`, etc.). */
function SwitchCardField({ field, value, onChange }) {
  const checked = Boolean(value);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={cx(styles.toggleCard, checked && styles.toggleCardActive)}
      onClick={() => onChange(!checked)}
    >
      <div className={styles.toggleCopy}>
        <span className={styles.toggleTitle}>{field.label}</span>
        {field.hint ? <span className={styles.toggleHint}>{field.hint}</span> : null}
      </div>
      <span className={styles.switchVisual} aria-hidden="true">
        <span className={cx(styles.switchTrack, checked && styles.switchTrackOn)}>
          <span className={styles.switchThumb} />
        </span>
        <span className={styles.switchText}>{checked ? "Sí" : "No"}</span>
      </span>
    </button>
  );
}

/**
 * Control de un campo según su `type`.
 * @param {{ field: any, value: any, error?: string, currentUrl?: string | null, onChange: (value: any) => void }} props
 */
export function ControlField({ field, value, error, currentUrl, onChange }) {
  switch (field.type) {
    case "checkbox":
      return <SwitchCardField field={field} value={value} onChange={onChange} />;
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
      return <FileField field={field} value={value} error={error} currentUrl={currentUrl} onChange={onChange} />;
    case "textarea":
      return (
        <Field
          as="textarea"
          label={field.label}
          required={field.required}
          placeholder={field.placeholder}
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
          placeholder={field.placeholder}
          prefix={field.prefix}
          suffix={field.suffix}
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
          placeholder={field.placeholder}
          prefix={field.prefix}
          suffix={field.suffix}
          autoComplete={field.type === "password" ? "new-password" : "off"}
          value={value}
          hint={field.hint}
          error={error}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
}
