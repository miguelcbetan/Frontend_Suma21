import { useEffect, useMemo, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { describeError, donationsService } from "@/core/api";

import styles from "./SignaturesPanel.module.css";

/** Formatos que acepta `POST /donations/signatures`. */
const SIGNATURE_TYPES = ["image/png", "image/jpeg"];
const SIGNATURE_ACCEPT = SIGNATURE_TYPES.join(",");
/** Límite preventivo en el navegador (el mismo que el backend aplica a las imágenes de productos). */
const MAX_BYTES = 5 * 1024 * 1024;

const ROLES = [
  {
    id: "legal_representative",
    label: "Representante legal",
    hint: "Firma de quien representa legalmente a la fundación.",
  },
  {
    id: "tax_auditor",
    label: "Revisor fiscal / Contador",
    hint: "Firma del revisor fiscal o contador que avala el certificado.",
  },
];

const ROLE_LABELS = Object.fromEntries(ROLES.map(({ id, label }) => [id, label]));

/** @returns {string | null} Mensaje de error, o `null` si la imagen sirve. */
function validateSignature(file) {
  if (!SIGNATURE_TYPES.includes(file.type)) {
    return `Formato no permitido${file.type ? ` (${file.type})` : ""}. Usa una imagen PNG o JPG.`;
  }
  if (file.size > MAX_BYTES) {
    return `La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)} MB; el máximo es 5 MB.`;
  }
  return null;
}

/** Selector de una firma con validación inmediata y vista previa sobre fondo blanco, como en el certificado. */
function SignatureSlot({ role, file, error, disabled, onChange }) {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  return (
    <div className={styles.slot}>
      <Field
        label={role.label}
        type="file"
        accept={SIGNATURE_ACCEPT}
        hint={`${role.hint} PNG o JPG, máximo 5 MB. Se recomienda fondo blanco o transparente.`}
        error={error}
        disabled={disabled}
        onChange={(event) => {
          const chosen = event.target.files?.[0] ?? null;
          const problem = chosen ? validateSignature(chosen) : null;
          if (problem) event.target.value = "";
          onChange(problem ? null : chosen, problem ?? "");
        }}
      />
      <figure className={styles.preview}>
        {preview ? (
          <img src={preview} alt={`Vista previa de la firma: ${role.label}`} />
        ) : (
          <span className={styles.placeholder}>
            <Icon name="pencil" size={22} />
            Sin cambios
          </span>
        )}
        <figcaption>{file ? "Firma nueva elegida" : "Se conserva la firma actual"}</figcaption>
      </figure>
    </div>
  );
}

/**
 * Firmas oficiales de los certificados de donación
 * (`POST /api/v1/donations/signatures`, multipart). Se puede reemplazar una o
 * ambas: la que no se elija se conserva. El backend no expone las firmas
 * actuales, así que solo se muestra la vista previa de las nuevas.
 */
export function SignaturesPanel() {
  const empty = { legal_representative: null, tax_auditor: null };
  const [files, setFiles] = useState(empty);
  const [errors, setErrors] = useState({ legal_representative: "", tax_auditor: "" });
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  // Cambiar la clave vuelve a montar los campos de archivo para vaciarlos tras guardar.
  const [resetKey, setResetKey] = useState(0);
  const toast = useToast();

  const chosen = ROLES.filter(({ id }) => files[id]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (chosen.length === 0) {
      setFormError("Elige al menos una firma para actualizar.");
      return;
    }
    setPending(true);
    setFormError("");
    try {
      const result = await donationsService.uploadSignatures(files);
      const updated = (result?.updated_roles ?? chosen.map(({ id }) => id)).map((id) => ROLE_LABELS[id] ?? id);
      toast.success(`Firmas actualizadas: ${updated.join(" y ")}. Los próximos certificados las usarán.`);
      setFiles(empty);
      setResetKey((key) => key + 1);
    } catch (error) {
      setFormError(describeError(error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardBody>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <Alert tone="info">
            Estas firmas aparecen en todos los certificados de donación (monetarias, en especie y del Plan Padrino).
            Puedes cambiar solo una: la que no elijas se conserva. Mientras no estén configuradas, los certificados no
            se pueden generar.
          </Alert>

          <div className={styles.slots} key={resetKey}>
            {ROLES.map((role) => (
              <SignatureSlot
                key={role.id}
                role={role}
                file={files[role.id]}
                error={errors[role.id]}
                disabled={pending}
                onChange={(file, problem) => {
                  setFiles((current) => ({ ...current, [role.id]: file }));
                  setErrors((current) => ({ ...current, [role.id]: problem }));
                  setFormError("");
                }}
              />
            ))}
          </div>

          {formError ? <Alert tone="error">{formError}</Alert> : null}

          <div className={styles.actions}>
            <Button type="submit" disabled={pending || chosen.length === 0}>
              <Icon name="check" size={18} />
              {pending
                ? "Guardando firmas…"
                : chosen.length === 2
                  ? "Guardar ambas firmas"
                  : chosen.length === 1
                    ? `Guardar firma: ${chosen[0].label}`
                    : "Guardar firmas"}
            </Button>
            {chosen.length > 0 && !pending ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setFiles(empty);
                  setErrors({ legal_representative: "", tax_auditor: "" });
                  setResetKey((key) => key + 1);
                }}
              >
                Descartar selección
              </Button>
            ) : null}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
