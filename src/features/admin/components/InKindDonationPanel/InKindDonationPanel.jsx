import { useCallback, useEffect, useRef, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { describeError, donationsService, inventoryService, toList } from "@/core/api";
import { todayISO } from "@/core/utils/date";

import styles from "./InKindDonationPanel.module.css";

function createLine(id) {
  return { id, inventory_item_id: "", quantity: "1" };
}

function validateForm(date, lines) {
  const dateError = date ? "" : "La fecha de recepción es obligatoria.";
  const lineErrors = lines.map((line) => {
    const errors = {};
    if (!line.inventory_item_id) errors.inventory_item_id = "Selecciona un artículo.";

    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) errors.quantity = "Escribe una cantidad entera mayor que 0.";

    return errors;
  });

  return { dateError, lineErrors };
}

/**
 * Registro de una donación en especie recibida por la fundación
 * (`POST /api/v1/donations/inkind`): fecha, notas y uno o más artículos
 * existentes del inventario con su cantidad. El backend toma al usuario del token.
 */
export function InKindDonationPanel() {
  const nextLineId = useRef(1);
  const [inventory, setInventory] = useState({ status: "loading", items: [], error: "" });
  const [date, setDate] = useState(todayISO);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([createLine(0)]);
  const [errors, setErrors] = useState({ date: "", lines: [] });
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
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
    setFormError("");
    setSuccess("");
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
    setDate(todayISO());
    setNotes("");
    setLines([createLine(nextLineId.current++)]);
    setErrors({ date: "", lines: [] });
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validation = validateForm(date, lines);
    setErrors({ date: validation.dateError, lines: validation.lineErrors });
    clearMessages();

    if (validation.dateError || validation.lineErrors.some((line) => Object.keys(line).length > 0)) {
      setFormError("Revisa los campos marcados.");
      return;
    }

    setPending(true);
    try {
      await donationsService.createInKind({
        donation_date: date,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        items: lines.map((line) => ({
          inventory_item_id: line.inventory_item_id,
          quantity: Number(line.quantity),
        })),
      });
      resetForm();
      setSuccess("La donación en especie se registró correctamente y el stock del inventario se actualizó.");
      loadInventory();
    } catch (error) {
      setFormError(describeError(error).message);
    } finally {
      setPending(false);
    }
  }

  const allItemsUsed = lines.length >= inventory.items.length;
  const units = lines.reduce((sum, line) => {
    const quantity = Number(line.quantity);
    return sum + (Number.isInteger(quantity) && quantity > 0 ? quantity : 0);
  }, 0);

  return (
    <Card>
      <CardBody className={styles.body}>
        {success ? <Alert tone="success">{success}</Alert> : null}
        {formError ? <Alert tone="error">{formError}</Alert> : null}

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
                  hint="Opcional. Por ejemplo: quién entregó la donación o el estado de los artículos."
                  onChange={(event) => {
                    setNotes(event.target.value);
                    setSuccess("");
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
              </p>
              <Button type="submit" disabled={pending}>
                {pending ? "Registrando…" : "Registrar donación"}
              </Button>
            </div>
          </form>
        ) : null}
      </CardBody>
    </Card>
  );
}
