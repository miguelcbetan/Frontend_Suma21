import { useCallback, useEffect, useRef, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiError, describeError, donationsService, inventoryService, toList } from "@/core/api";
import { formatCurrency } from "@/core/utils/currency";
import { todayISO } from "@/core/utils/date";
import { DOCUMENT_NUMBER_HINT, DOCUMENT_TYPES } from "@/core/utils/documentTypes";
import { base64ToBlob, downloadBlob } from "@/core/utils/downloadFile";

import styles from "./InKindDonationPanel.module.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY_DONOR = { name: "", documentType: "", documentNumber: "", email: "" };

function createLine(id) {
  return { id, inventory_item_id: "", quantity: "1", estimated_unit_value: "" };
}

/** Pesos con máximo dos decimales. */
const hasValidDecimals = (value) => Math.round(value * 100) === value * 100;

function validateForm(date, donor, lines) {
  const donorErrors = {};
  if (!donor.name.trim()) donorErrors.name = "Escribe el nombre completo o la razón social.";
  if (!donor.documentType) donorErrors.documentType = "Selecciona el tipo de documento.";
  if (!donor.documentNumber.trim()) donorErrors.documentNumber = "Escribe el número de documento.";
  if (!donor.email.trim()) donorErrors.email = "Escribe el correo del donante.";
  else if (!EMAIL_PATTERN.test(donor.email.trim())) donorErrors.email = "Escribe un correo válido.";

  const dateError = date ? "" : "La fecha de recepción es obligatoria.";
  const lineErrors = lines.map((line) => {
    const errors = {};
    if (!line.inventory_item_id) errors.inventory_item_id = "Selecciona un artículo.";

    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) errors.quantity = "Escribe una cantidad entera mayor que 0.";

    const value = Number(line.estimated_unit_value);
    if (line.estimated_unit_value === "") {
      errors.estimated_unit_value = "Escribe el valor unitario estimado.";
    } else if (!Number.isFinite(value) || value <= 0 || !hasValidDecimals(value)) {
      errors.estimated_unit_value = "Escribe un valor mayor que 0, con máximo dos decimales.";
    }
    return errors;
  });

  return { dateError, donorErrors, lineErrors };
}

/**
 * Registro de una donación en especie recibida por la fundación
 * (`POST /api/v1/donations/inkind`, solo ADMIN): datos del donante (nombre o
 * razón social, documento y correo), fecha, notas y artículos del inventario
 * con su cantidad y valor unitario estimado (obligatorio). El backend busca o crea al donante por su
 * documento, suma el stock, emite el certificado (`CERT-YYYY-NNNN`), lo envía
 * por correo al donante y lo devuelve en Base64 para descargarlo aquí.
 * @param {{ onNavigate?: (sectionId: string) => void }} props `onNavigate`
 *   lleva a otra sección del panel (p. ej. «Firmas de certificados»).
 */
export function InKindDonationPanel({ onNavigate }) {
  const nextLineId = useRef(1);
  const [inventory, setInventory] = useState({ status: "loading", items: [], error: "" });
  const [donor, setDonor] = useState(EMPTY_DONOR);
  const [date, setDate] = useState(todayISO);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([createLine(0)]);
  const [errors, setErrors] = useState({ date: "", donor: {}, lines: [] });
  const [formError, setFormError] = useState({ message: "", missingSignatures: false });
  const [result, setResult] = useState(null);
  const toast = useToast();
  const [pending, setPending] = useState(false);

  const loadInventory = useCallback(
    () =>
      inventoryService
        .list()
        .then((payload) => setInventory({ status: "ready", items: toList(payload), error: "" }))
        .catch((error) => setInventory({ status: "error", items: [], error: describeError(error).message })),
    [],
  );

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  function clearMessages() {
    setFormError({ message: "", missingSignatures: false });
  }

  function updateDonor(key, value) {
    setDonor((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, donor: { ...current.donor, [key]: "" } }));
    clearMessages();
  }

  function updateLine(index, key, value) {
    setLines((current) => current.map((line, position) => (position === index ? { ...line, [key]: value } : line)));
    setErrors((current) => ({
      ...current,
      lines: current.lines.map((lineErrors, position) =>
        position === index ? { ...lineErrors, [key]: "" } : lineErrors,
      ),
    }));
    clearMessages();
  }

  function addLine() {
    setLines((current) => [...current, createLine(nextLineId.current++)]);
    setErrors((current) => ({ ...current, lines: [...current.lines, {}] }));
    clearMessages();
  }

  function removeLine(index) {
    setLines((current) => current.filter((_, position) => position !== index));
    setErrors((current) => ({ ...current, lines: current.lines.filter((_, position) => position !== index) }));
    clearMessages();
  }

  function resetForm() {
    setDonor(EMPTY_DONOR);
    setDate(todayISO());
    setNotes("");
    setLines([createLine(nextLineId.current++)]);
    setErrors({ date: "", donor: {}, lines: [] });
    clearMessages();
  }

  function downloadCertificate(certificate) {
    try {
      downloadBlob(base64ToBlob(certificate.pdfBase64), `certificado-${certificate.number}.pdf`);
    } catch {
      toast.info("No pudimos abrir el PDF del certificado. El donante también lo recibió por correo.");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validation = validateForm(date, donor, lines);
    setErrors({ date: validation.dateError, donor: validation.donorErrors, lines: validation.lineErrors });
    clearMessages();

    const hasErrors =
      validation.dateError ||
      Object.keys(validation.donorErrors).length > 0 ||
      validation.lineErrors.some((line) => Object.keys(line).length > 0);
    if (hasErrors) {
      setFormError({ message: "Revisa los campos marcados.", missingSignatures: false });
      return;
    }

    setPending(true);
    setResult(null);
    try {
      const response = await donationsService.createInKind({
        donation_date: date,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        donor_name: donor.name.trim(),
        donor_document_type: donor.documentType,
        donor_document_number: donor.documentNumber.trim(),
        donor_email: donor.email.trim(),
        items: lines.map((line) => ({
          inventory_item_id: line.inventory_item_id,
          quantity: Number(line.quantity),
          estimated_unit_value: Number(line.estimated_unit_value),
        })),
      });
      const certificate = response?.certificate_pdf_base64
        ? { number: response.certificate_number ?? `donacion-${response.donationId}`, pdfBase64: response.certificate_pdf_base64 }
        : null;
      setResult({ donor: donor.name.trim(), email: donor.email.trim(), certificate });
      resetForm();
      toast.success("La donación en especie se registró, el stock se actualizó y se emitió el certificado.");
      loadInventory();
    } catch (error) {
      const missingSignatures = error instanceof ApiError && error.status === 409;
      setFormError({
        message: missingSignatures
          ? `${describeError(error).message} Sube las firmas oficiales para poder emitir certificados.`
          : describeError(error).message,
        missingSignatures,
      });
    } finally {
      setPending(false);
    }
  }

  const allItemsUsed = lines.length >= inventory.items.length;
  const units = lines.reduce((sum, line) => {
    const quantity = Number(line.quantity);
    return sum + (Number.isInteger(quantity) && quantity > 0 ? quantity : 0);
  }, 0);
  const estimatedTotal = lines.reduce((sum, line) => {
    const quantity = Number(line.quantity);
    const value = Number(line.estimated_unit_value);
    if (line.estimated_unit_value === "" || !Number.isFinite(value) || !Number.isInteger(quantity)) return sum;
    return sum + value * quantity;
  }, 0);

  return (
    <Card>
      <CardBody className={styles.body}>
        {result ? (
          <Alert tone="success">
            <div className={styles.result}>
              <p>
                Donación de <strong>{result.donor}</strong> registrada.
                {result.certificate ? (
                  <>
                    {" "}
                    Se emitió el certificado <strong>{result.certificate.number}</strong> y se envió a{" "}
                    <strong>{result.email}</strong>.
                  </>
                ) : null}
              </p>
              {result.certificate ? (
                <Button size="sm" onClick={() => downloadCertificate(result.certificate)}>
                  <Icon name="receipt" size={16} />
                  Descargar certificado (PDF)
                </Button>
              ) : null}
            </div>
          </Alert>
        ) : null}

        {formError.message ? (
          <Alert tone="error">
            {formError.message}
            {formError.missingSignatures && onNavigate ? (
              <>
                {" "}
                <Button variant="outline" size="sm" onClick={() => onNavigate("signatures")}>
                  Ir a Firmas de certificados
                </Button>
              </>
            ) : null}
          </Alert>
        ) : null}

        {inventory.status === "loading" ? (
          <>
            <p role="status" className="sr-only">
              Cargando artículos de inventario…
            </p>
            <div className={styles.loading} aria-hidden="true">
              <Skeleton height="2.75rem" width="16rem" />
              <Skeleton height="6rem" />
              <Skeleton height="7rem" />
            </div>
          </>
        ) : null}

        {inventory.status === "error" ? (
          <EmptyState
            compact
            icon="alert"
            tone="danger"
            title="No se pudieron cargar los artículos"
            description={inventory.error}
            actions={
              <Button variant="outline" onClick={loadInventory}>
                <Icon name="refresh" size={16} />
                Reintentar
              </Button>
            }
          />
        ) : null}

        {inventory.status === "ready" && inventory.items.length === 0 ? (
          <EmptyState
            compact
            icon="package"
            title="No hay artículos de inventario"
            description="Crea primero los artículos desde la sección Inventario para poder registrar una donación."
          />
        ) : null}

        {inventory.status === "ready" && inventory.items.length > 0 ? (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <section className={styles.block} aria-labelledby="inkind-donor-title">
              <div className={styles.blockHead}>
                <h3 id="inkind-donor-title" className={styles.blockTitle}>
                  Datos del donante
                </h3>
                <p className={styles.blockHint}>
                  Persona o empresa que entregó los artículos. El certificado se emite a su nombre y se envía a su
                  correo. Si ya donó antes con el mismo documento, se usa su registro existente.
                </p>
              </div>
              <div className={styles.donorFields}>
                <Field
                  label="Nombre completo o razón social"
                  autoComplete="off"
                  required
                  disabled={pending}
                  value={donor.name}
                  error={errors.donor.name}
                  className={styles.wide}
                  onChange={(event) => updateDonor("name", event.target.value)}
                />
                <Field
                  as="select"
                  label="Tipo de documento"
                  required
                  disabled={pending}
                  value={donor.documentType}
                  error={errors.donor.documentType}
                  onChange={(event) => updateDonor("documentType", event.target.value)}
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
                  autoComplete="off"
                  required
                  disabled={pending}
                  value={donor.documentNumber}
                  hint={donor.documentType === "NIT" ? DOCUMENT_NUMBER_HINT : undefined}
                  error={errors.donor.documentNumber}
                  onChange={(event) => updateDonor("documentNumber", event.target.value)}
                />
                <Field
                  label="Correo electrónico"
                  type="email"
                  autoComplete="off"
                  required
                  disabled={pending}
                  value={donor.email}
                  hint="Aquí llegará el certificado de donación."
                  error={errors.donor.email}
                  className={styles.wide}
                  onChange={(event) => updateDonor("email", event.target.value)}
                />
              </div>
            </section>

            <section className={styles.block} aria-labelledby="inkind-reception-title">
              <h3 id="inkind-reception-title" className={styles.blockTitle}>
                Datos de la recepción
              </h3>
              <div className={styles.details}>
                <Field
                  label="Fecha de recepción"
                  type="date"
                  required
                  disabled={pending}
                  value={date}
                  error={errors.date}
                  className={styles.date}
                  onChange={(event) => {
                    setDate(event.target.value);
                    setErrors((current) => ({ ...current, date: "" }));
                    clearMessages();
                  }}
                />
                <Field
                  label="Notas"
                  as="textarea"
                  rows={3}
                  disabled={pending}
                  value={notes}
                  hint="Opcional. Por ejemplo: el estado de los artículos o quién los recibió."
                  onChange={(event) => {
                    setNotes(event.target.value);
                  }}
                />
              </div>
            </section>

            <section className={styles.block} aria-labelledby="inkind-items-title">
              <h3 id="inkind-items-title" className={styles.blockTitle}>
                Artículos recibidos
              </h3>

              <div className={styles.lines}>
                {lines.map((line, index) => {
                  const selectedElsewhere = new Set(
                    lines.filter((other) => other.id !== line.id).map((other) => other.inventory_item_id),
                  );

                  return (
                    <fieldset key={line.id} className={styles.line} disabled={pending}>
                      <legend className="sr-only">Artículo {index + 1}</legend>
                      <div className={styles.lineHeader}>
                        <p className={styles.lineTitle} aria-hidden="true">
                          <span className={styles.lineNumber}>{index + 1}</span>
                          Artículo {index + 1}
                        </p>
                        {lines.length > 1 ? (
                          <Button
                            variant="danger"
                            size="sm"
                            aria-label={`Quitar artículo ${index + 1}`}
                            onClick={() => removeLine(index)}
                          >
                            <Icon name="trash" size={16} />
                            Quitar
                          </Button>
                        ) : null}
                      </div>
                      <div className={styles.lineFields}>
                        <Field
                          as="select"
                          label="Artículo"
                          required
                          value={line.inventory_item_id}
                          error={errors.lines[index]?.inventory_item_id}
                          onChange={(event) => updateLine(index, "inventory_item_id", event.target.value)}
                        >
                          <option value="">Selecciona un artículo</option>
                          {inventory.items.map((item) => (
                            <option
                              key={item.id}
                              value={String(item.id)}
                              disabled={selectedElsewhere.has(String(item.id))}
                            >
                              {item.name} · stock {item.stock ?? 0}
                            </option>
                          ))}
                        </Field>
                        <Field
                          label="Cantidad"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          step={1}
                          required
                          value={line.quantity}
                          error={errors.lines[index]?.quantity}
                          onChange={(event) => updateLine(index, "quantity", event.target.value)}
                        />
                        <Field
                          label="Valor unitario estimado"
                          type="number"
                          inputMode="decimal"
                          min={0.01}
                          step="0.01"
                          required
                          placeholder="Ej.: 20000"
                          hint="En pesos, por unidad."
                          value={line.estimated_unit_value}
                          error={errors.lines[index]?.estimated_unit_value}
                          onChange={(event) => updateLine(index, "estimated_unit_value", event.target.value)}
                        />
                      </div>
                    </fieldset>
                  );
                })}
              </div>

              <div className={styles.addRow}>
                <Button variant="outline" size="sm" onClick={addLine} disabled={pending || allItemsUsed}>
                  <Icon name="plus" size={16} />
                  Agregar otro artículo
                </Button>
                {allItemsUsed ? (
                  <p className={styles.addHint}>Ya agregaste todos los artículos del inventario.</p>
                ) : null}
              </div>
            </section>

            <div className={styles.footer}>
              <p className={styles.summary} aria-live="polite">
                {lines.length} {lines.length === 1 ? "artículo" : "artículos"} · {units}{" "}
                {units === 1 ? "unidad" : "unidades"}
                {estimatedTotal > 0 ? ` · Valor estimado ${formatCurrency(estimatedTotal)}` : ""}
              </p>
              <Button type="submit" disabled={pending}>
                {pending ? "Registrando y emitiendo certificado…" : "Registrar donación"}
              </Button>
            </div>
          </form>
        ) : null}
      </CardBody>
    </Card>
  );
}
