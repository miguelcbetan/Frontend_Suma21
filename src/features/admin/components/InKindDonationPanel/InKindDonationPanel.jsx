import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { Alert } from "@/components/ui/Alert";
import { Button, buttonClassName } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiError, describeError, donationsService, inventoryService, toList } from "@/core/api";
import { formatCurrency } from "@/core/utils/currency";
import { cx } from "@/core/utils/cx";
import { todayISO } from "@/core/utils/date";
import { DOCUMENT_NUMBER_HINT, DOCUMENT_TYPES } from "@/core/utils/documentTypes";
import { base64ToBlob, downloadBlob } from "@/core/utils/downloadFile";

import styles from "./InKindDonationPanel.module.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY_DONOR = { name: "", documentType: "", documentNumber: "", email: "" };

const STEPS = [
  { id: "donor", title: "Datos del donante", subtitle: "Identificación y correo", icon: "user" },
  { id: "reception", title: "Fecha y descripción", subtitle: "Recepción y notas", icon: "clock" },
  { id: "items", title: "Artículos de inventario", subtitle: "Cantidad y valor", icon: "package" },
];

function createLine(id) {
  return { id, inventory_item_id: "", quantity: "1", estimated_unit_value: "" };
}

/** Pesos con máximo dos decimales. */
const hasValidDecimals = (value) => Math.round(value * 100) === value * 100;

function validateDonorStep(donor) {
  const donorErrors = {};
  if (!donor.name.trim()) donorErrors.name = "Escribe el nombre completo o la razón social.";
  if (!donor.documentType) donorErrors.documentType = "Selecciona el tipo de documento.";
  if (!donor.documentNumber.trim()) donorErrors.documentNumber = "Escribe el número de documento.";
  if (!donor.email.trim()) donorErrors.email = "Escribe el correo del donante.";
  else if (!EMAIL_PATTERN.test(donor.email.trim())) donorErrors.email = "Escribe un correo válido.";
  return donorErrors;
}

function validateReceptionStep(date) {
  return date ? "" : "La fecha de recepción es obligatoria.";
}

function validateLinesStep(lines) {
  return lines.map((line) => {
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
}

function formatShortDate(isoDate) {
  if (!isoDate) return "—";
  const [year, month, day] = isoDate.split("-");
  return year && month && day ? `${day}/${month}/${year}` : isoDate;
}

/**
 * Wizard en 3 etapas para registrar una donación en especie recibida por la
 * fundación (`POST /api/v1/donations/inkind`, solo ADMIN):
 *   1. Datos del donante (identificación y correo)
 *   2. Fecha y descripción de la recepción
 *   3. Artículos del inventario recibidos, cantidad y valor unitario estimado
 */
export function InKindDonationPanel({ onNavigate }) {
  const nextLineId = useRef(1);
  const [step, setStep] = useState(0);
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

  function stepQuantity(index, delta) {
    const current = Number(lines[index]?.quantity);
    const base = Number.isInteger(current) && current >= 1 ? current : 1;
    updateLine(index, "quantity", String(Math.max(1, base + delta)));
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
    setStep(0);
    setDonor(EMPTY_DONOR);
    setDate(todayISO());
    setNotes("");
    setLines([createLine(nextLineId.current++)]);
    setErrors({ date: "", donor: {}, lines: [] });
    clearMessages();
  }

  function goToStep(target) {
    clearMessages();
    if (target <= step) {
      setStep(target);
      return;
    }
    if (step === 0) {
      const donorErrors = validateDonorStep(donor);
      if (Object.keys(donorErrors).length > 0) {
        setErrors((current) => ({ ...current, donor: donorErrors }));
        setFormError({ message: "Completa los datos del donante para continuar.", missingSignatures: false });
        return;
      }
      if (target === 1) {
        setStep(1);
        return;
      }
    }
    const dateError = validateReceptionStep(date);
    if (dateError) {
      setErrors((current) => ({ ...current, date: dateError }));
      setFormError({ message: "Indica la fecha de recepción para continuar.", missingSignatures: false });
      return;
    }
    setStep(target);
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
    const donorErrors = validateDonorStep(donor);
    const dateError = validateReceptionStep(date);
    const lineErrors = validateLinesStep(lines);
    setErrors({ date: dateError, donor: donorErrors, lines: lineErrors });
    clearMessages();

    if (Object.keys(donorErrors).length > 0) {
      setStep(0);
      setFormError({ message: "Revisa los datos del donante.", missingSignatures: false });
      return;
    }
    if (dateError) {
      setStep(1);
      setFormError({ message: "Revisa la fecha de recepción.", missingSignatures: false });
      return;
    }
    if (lineErrors.some((line) => Object.keys(line).length > 0)) {
      setFormError({ message: "Revisa los artículos marcados antes de registrar.", missingSignatures: false });
      return;
    }

    setPending(true);
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
      toast.success("Donación en especie registrada y certificado emitido.");
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

  const inventoryById = new Map(inventory.items.map((item) => [String(item.id), item]));
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

  if (result) {
    return (
      <Card>
        <CardBody className={styles.successCard}>
          <div className={styles.successIcon} aria-hidden="true">
            <Icon name="check" size={32} />
          </div>
          <div className={styles.successCopy}>
            <p className={styles.successEyebrow}>Registro completado</p>
            <h2 className={styles.successTitle}>Donación en especie registrada</h2>
            <p className={styles.successText}>
              Se actualizó el stock del inventario para la donación de <strong>{result.donor}</strong>.
              {result.certificate ? (
                <>
                  {" "}
                  Se emitió el certificado <strong>{result.certificate.number}</strong> y se envió a{" "}
                  <strong>{result.email}</strong>.
                </>
              ) : null}
            </p>
          </div>
          <div className={styles.successActions}>
            {result.certificate ? (
              <Button onClick={() => downloadCertificate(result.certificate)}>
                <Icon name="receipt" size={18} />
                Descargar certificado (PDF)
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                resetForm();
              }}
            >
              <Icon name="plus" size={18} />
              Registrar otra donación
            </Button>
            <Link to="/admin?seccion=donations-history" className={buttonClassName({ variant: "ghost" })}>
              Ver historial de donaciones
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className={styles.body}>
        {inventory.status === "loading" ? (
          <>
            <p role="status" className="sr-only">
              Cargando artículos de inventario…
            </p>
            <div className={styles.loading} aria-hidden="true">
              <Skeleton height="3.5rem" />
              <Skeleton height="12rem" />
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
            description="Crea primero los artículos desde la sección Inventario del panel admin para poder registrar una donación."
            actions={
              <Link to="/admin?seccion=inventory" className={buttonClassName({ variant: "outline" })}>
                Ir a Inventario
              </Link>
            }
          />
        ) : null}

        {inventory.status === "ready" && inventory.items.length > 0 ? (
          <>
            <nav aria-label="Etapas del registro">
              <ol className={styles.stepper}>
                {STEPS.map((item, index) => {
                  const done = index < step;
                  const active = index === step;
                  return (
                    <li
                      key={item.id}
                      className={cx(styles.stepItem, active && styles.stepActive, done && styles.stepDone)}
                    >
                      <button
                        type="button"
                        className={styles.stepButton}
                        aria-current={active ? "step" : undefined}
                        disabled={pending || index > step}
                        onClick={() => goToStep(index)}
                      >
                        <span className={styles.stepBadge} aria-hidden="true">
                          {done ? <Icon name="check" size={16} /> : index + 1}
                        </span>
                        <span className={styles.stepText}>
                          <span className={styles.stepTitle}>{item.title}</span>
                          <span className={styles.stepSubtitle}>{item.subtitle}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>

            {formError.message ? (
              <Alert tone="error">
                {formError.message}
                {formError.missingSignatures ? (
                  <>
                    {" "}
                    {onNavigate ? (
                      <Button variant="outline" size="sm" onClick={() => onNavigate("signatures")}>
                        Ir a Firmas de certificados
                      </Button>
                    ) : (
                      <Link to="/admin?seccion=signatures" className={buttonClassName({ variant: "outline", size: "sm" })}>
                        Ir a Firmas de certificados
                      </Link>
                    )}
                  </>
                ) : null}
              </Alert>
            ) : null}

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              {step === 0 ? (
                <section className={styles.stage} aria-labelledby="inkind-donor-title">
                  <div className={styles.stageHead}>
                    <h2 id="inkind-donor-title" className={styles.stageTitle}>
                      Datos del donante
                    </h2>
                    <p className={styles.stageHint}>
                      Persona o empresa que entregó los artículos. Si ya donó antes con el mismo documento,
                      reutilizamos su registro automáticamente.
                    </p>
                  </div>
                  <div className={styles.donorFields}>
                    <Field
                      label="Nombre completo o razón social"
                      placeholder="Ej.: Fundación Amiga o María Pérez"
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
                      placeholder="Ej.: 1020304050"
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
                      placeholder="correo@ejemplo.com"
                      autoComplete="off"
                      required
                      disabled={pending}
                      value={donor.email}
                      hint="Aquí enviaremos el certificado de donación en PDF."
                      error={errors.donor.email}
                      className={styles.wide}
                      onChange={(event) => updateDonor("email", event.target.value)}
                    />
                  </div>
                  <div className={styles.stageFooter}>
                    <span className={styles.stepCounter}>Etapa 1 de 3</span>
                    <Button type="button" onClick={() => goToStep(1)} disabled={pending}>
                      Continuar a fecha y descripción
                      <Icon name="arrowRight" size={18} />
                    </Button>
                  </div>
                </section>
              ) : null}

              {step === 1 ? (
                <section className={styles.stage} aria-labelledby="inkind-reception-title">
                  <div className={styles.contextStrip}>
                    <div className={styles.contextChip}>
                      <span className={styles.contextLabel}>Donante</span>
                      <strong className={styles.contextValue}>
                        {donor.name.trim()} · {donor.documentType} {donor.documentNumber.trim()}
                      </strong>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setStep(0)} disabled={pending}>
                      Cambiar
                    </Button>
                  </div>

                  <div className={styles.stageHead}>
                    <h2 id="inkind-reception-title" className={styles.stageTitle}>
                      Fecha y descripción de la recepción
                    </h2>
                    <p className={styles.stageHint}>
                      Indica cuándo recibió la fundación los artículos y agrega observaciones si lo necesitas.
                    </p>
                  </div>

                  <div className={styles.receptionFields}>
                    <Field
                      label="Fecha de recepción"
                      type="date"
                      required
                      disabled={pending}
                      value={date}
                      error={errors.date}
                      className={styles.dateField}
                      onChange={(event) => {
                        setDate(event.target.value);
                        setErrors((current) => ({ ...current, date: "" }));
                        clearMessages();
                      }}
                    />
                    <Field
                      label="Descripción o notas de la entrega"
                      as="textarea"
                      rows={4}
                      disabled={pending}
                      value={notes}
                      placeholder="Opcional. Por ejemplo: cajas selladas en buen estado, recibido por coordinación."
                      hint="Esta descripción ayuda a llevar control en el historial administrativo."
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </div>

                  <div className={styles.stageFooter}>
                    <Button variant="outline" onClick={() => setStep(0)} disabled={pending}>
                      <Icon name="arrowLeft" size={18} />
                      Volver a donante
                    </Button>
                    <Button type="button" onClick={() => goToStep(2)} disabled={pending}>
                      Continuar a artículos
                      <Icon name="arrowRight" size={18} />
                    </Button>
                  </div>
                </section>
              ) : null}

              {step === 2 ? (
                <section className={styles.stage} aria-labelledby="inkind-items-title">
                  <div className={styles.contextStrip}>
                    <div className={styles.contextGrid}>
                      <div className={styles.contextChip}>
                        <span className={styles.contextLabel}>Donante</span>
                        <strong className={styles.contextValue}>
                          {donor.name.trim()} · {donor.documentType} {donor.documentNumber.trim()}
                        </strong>
                        <button type="button" className={styles.editInline} onClick={() => setStep(0)}>
                          Editar
                        </button>
                      </div>
                      <div className={styles.contextChip}>
                        <span className={styles.contextLabel}>Recepción</span>
                        <strong className={styles.contextValue}>
                          {formatShortDate(date)}
                          {notes.trim() ? ` · ${notes.trim()}` : ""}
                        </strong>
                        <button type="button" className={styles.editInline} onClick={() => setStep(1)}>
                          Editar
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={styles.stageHead}>
                    <h2 id="inkind-items-title" className={styles.stageTitle}>
                      Artículos de inventario recibidos
                    </h2>
                    <p className={styles.stageHint}>
                      Elige los artículos recibidos, ajusta la cantidad que entra al stock e indica su valor unitario
                      estimado en pesos.
                    </p>
                  </div>

                  <div className={styles.lines}>
                    {lines.map((line, index) => {
                      const selectedElsewhere = new Set(
                        lines.filter((other) => other.id !== line.id).map((other) => other.inventory_item_id),
                      );
                      const chosenItem = inventoryById.get(String(line.inventory_item_id)) ?? null;
                      const qtyNum = Number(line.quantity);
                      const unitNum = Number(line.estimated_unit_value);
                      const lineSubtotal =
                        line.estimated_unit_value !== "" && Number.isFinite(unitNum) && Number.isInteger(qtyNum) && qtyNum > 0
                          ? unitNum * qtyNum
                          : null;

                      return (
                        <fieldset key={line.id} className={styles.line} disabled={pending}>
                          <legend className="sr-only">Artículo {index + 1}</legend>
                          <div className={styles.lineHeader}>
                            <div className={styles.lineHeading}>
                              <span className={styles.lineNumber} aria-hidden="true">
                                {index + 1}
                              </span>
                              <div>
                                <p className={styles.lineTitle}>
                                  {chosenItem ? chosenItem.name : `Artículo ${index + 1}`}
                                </p>
                                {chosenItem ? (
                                  <p className={styles.lineMeta}>Stock actual: {chosenItem.stock ?? 0} uds</p>
                                ) : null}
                              </div>
                            </div>
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

                          <div className={styles.lineGrid}>
                            <Field
                              as="select"
                              label="Artículo de inventario"
                              required
                              className={styles.wide}
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
                                  {item.name} · stock actual: {item.stock ?? 0} uds
                                </option>
                              ))}
                            </Field>

                            <div className={styles.qtyField}>
                              <span className={styles.qtyLabel}>
                                Cantidad recibida <span className={styles.required}>*</span>
                              </span>
                              <div className={styles.qtyControl}>
                                <button
                                  type="button"
                                  className={styles.qtyBtn}
                                  aria-label={`Disminuir cantidad del artículo ${index + 1}`}
                                  disabled={Number(line.quantity) <= 1}
                                  onClick={() => stepQuantity(index, -1)}
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  min={1}
                                  step={1}
                                  aria-label={`Cantidad recibida del artículo ${index + 1}`}
                                  className={styles.qtyInput}
                                  value={line.quantity}
                                  onChange={(event) => updateLine(index, "quantity", event.target.value)}
                                />
                                <button
                                  type="button"
                                  className={styles.qtyBtn}
                                  aria-label={`Aumentar cantidad del artículo ${index + 1}`}
                                  onClick={() => stepQuantity(index, 1)}
                                >
                                  +
                                </button>
                              </div>
                              {errors.lines[index]?.quantity ? (
                                <p className={styles.qtyError}>{errors.lines[index].quantity}</p>
                              ) : (
                                <p className={styles.qtyHint}>Se sumará al inventario.</p>
                              )}
                            </div>

                            <div className={styles.valueWrap}>
                              <Field
                                label="Valor unitario estimado"
                                type="number"
                                inputMode="decimal"
                                min={0.01}
                                step="0.01"
                                prefix="$"
                                suffix="COP"
                                required
                                placeholder="20000"
                                value={line.estimated_unit_value}
                                error={errors.lines[index]?.estimated_unit_value}
                                onChange={(event) => updateLine(index, "estimated_unit_value", event.target.value)}
                              />
                              {lineSubtotal !== null && lineSubtotal > 0 ? (
                                <p className={styles.subtotal}>Subtotal: {formatCurrency(lineSubtotal)}</p>
                              ) : null}
                            </div>
                          </div>
                        </fieldset>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    className={styles.addDashed}
                    onClick={addLine}
                    disabled={pending || allItemsUsed}
                  >
                    <Icon name="plus" size={18} />
                    {allItemsUsed
                      ? "Ya agregaste todos los artículos disponibles en el inventario"
                      : "Agregar otro artículo del inventario"}
                  </button>

                  <div className={styles.summaryBox} aria-live="polite">
                    <div className={styles.summaryStats}>
                      <span>
                        <strong>{lines.length}</strong> {lines.length === 1 ? "artículo" : "artículos"}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        <strong>{units}</strong> {units === 1 ? "unidad" : "unidades"} al inventario
                      </span>
                      {estimatedTotal > 0 ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className={styles.summaryTotal}>Total estimado {formatCurrency(estimatedTotal)}</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className={styles.stageFooter}>
                    <Button variant="outline" onClick={() => setStep(1)} disabled={pending}>
                      <Icon name="arrowLeft" size={18} />
                      Volver a recepción
                    </Button>
                    <Button type="submit" disabled={pending}>
                      {pending ? "Registrando y emitiendo certificado…" : "Registrar donación y emitir certificado"}
                    </Button>
                  </div>
                </section>
              ) : null}
            </form>
          </>
        ) : null}
      </CardBody>
    </Card>
  );
}
