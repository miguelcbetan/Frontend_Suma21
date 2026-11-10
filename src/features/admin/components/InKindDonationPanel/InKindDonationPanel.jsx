import { useCallback, useEffect, useRef, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { describeError, donationsService, inventoryService, toList } from "@/core/api";
import { todayISO } from "@/core/utils/date";

import styles from "./InKindDonationPanel.module.css";

function createLine(id) {
  return { id, inventory_item_id: "", quantity: "1", estimated_unit_value: "" };
}

function validateForm(date, lines) {
  const dateError = date ? "" : "La fecha de la donación es obligatoria.";
  const lineErrors = lines.map((line) => {
    const errors = {};
    if (!line.inventory_item_id) errors.inventory_item_id = "Selecciona un artículo.";

    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) errors.quantity = "Escribe una cantidad entera mayor que 0.";

    if (line.estimated_unit_value !== "") {
      const value = Number(line.estimated_unit_value);
      if (!Number.isFinite(value) || value < 0) errors.estimated_unit_value = "Escribe un valor igual o mayor que 0.";
    }

    return errors;
  });

  return { dateError, lineErrors };
}

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
        .catch((error) =>
          setInventory({ status: "error", items: [], error: describeError(error).message }),
        ),
    [],
  );

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  function updateLine(id, key, value) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, [key]: value } : line)));
    setErrors((current) => ({
      ...current,
      lines: current.lines.map((line, index) =>
        lines[index]?.id === id ? { ...line, [key]: "" } : line,
      ),
    }));
    setFormError("");
    setSuccess("");
  }

  function addLine() {
    setLines((current) => [...current, createLine(nextLineId.current++)]);
    setErrors((current) => ({ ...current, lines: [...current.lines, {}] }));
    setFormError("");
    setSuccess("");
  }

  function removeLine(id) {
    setLines((current) => current.filter((line) => line.id !== id));
    setErrors((current) => ({
      ...current,
      lines: lines.filter((line) => line.id !== id).map((line) => current.lines[lines.indexOf(line)] ?? {}),
    }));
    setFormError("");
    setSuccess("");
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
    setFormError("");
    setSuccess("");

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
          ...(line.estimated_unit_value !== ""
            ? { estimated_unit_value: Number(line.estimated_unit_value) }
            : {}),
        })),
      });
      resetForm();
      setSuccess("La donación en especie se registró correctamente.");
    } catch (error) {
      setFormError(describeError(error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h3 className={styles.heading}>Registrar artículos recibidos</h3>
        <p className={styles.description}>
          Selecciona uno o más artículos existentes en el inventario. La donación quedará asociada a la administradora
          autenticada.
        </p>
      </CardHeader>
      <CardBody>
        {success ? <Alert tone="success">{success}</Alert> : null}
        {formError ? <Alert tone="error">{formError}</Alert> : null}

        {inventory.status === "loading" ? (
          <div className={styles.loading} role="status" aria-label="Cargando artículos de inventario">
            <Skeleton height="2.75rem" />
            <Skeleton height="2.75rem" />
          </div>
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
            <div className={styles.details}>
              <Field
                label="Fecha de recepción"
                type="date"
                required
                disabled={pending}
                value={date}
                error={errors.date}
                onChange={(event) => {
                  setDate(event.target.value);
                  setErrors((current) => ({ ...current, date: "" }));
                  setFormError("");
                  setSuccess("");
                }}
              />
              <Field
                label="Notas"
                as="textarea"
                disabled={pending}
                value={notes}
                hint="Opcional. Puedes añadir detalles sobre la recepción."
                onChange={(event) => {
                  setNotes(event.target.value);
                  setSuccess("");
                }}
              />
            </div>

            <div className={styles.itemsHeader}>
              <h4>Artículos de la donación</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={addLine}
                disabled={pending || lines.length >= inventory.items.length}
              >
                <Icon name="plus" size={16} />
                Agregar artículo
              </Button>
            </div>

            <div className={styles.lines}>
              {lines.map((line, index) => {
                const selectedElsewhere = new Set(
                  lines.filter((other) => other.id !== line.id).map((other) => other.inventory_item_id),
                );

                return (
                  <div key={line.id} className={styles.line}>
                    <Field
                      as="select"
                      label={`Tipo de artículo ${index + 1}`}
                      required
                      disabled={pending}
                      value={line.inventory_item_id}
                      error={errors.lines[index]?.inventory_item_id}
                      onChange={(event) => updateLine(line.id, "inventory_item_id", event.target.value)}
                    >
                      <option value="">Selecciona un artículo</option>
                      {inventory.items.map((item) => (
                        <option
                          key={item.id}
                          value={String(item.id)}
                          disabled={selectedElsewhere.has(String(item.id))}
                        >
                          {item.name}
                        </option>
                      ))}
                    </Field>
                    <Field
                      label={`Cantidad ${index + 1}`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      required
                      disabled={pending}
                      value={line.quantity}
                      error={errors.lines[index]?.quantity}
                      onChange={(event) => updateLine(line.id, "quantity", event.target.value)}
                    />
                    <Field
                      label={`Valor unitario estimado (COP) ${index + 1}`}
                      type="number"
                      min={0}
                      step="any"
                      disabled={pending}
                      value={line.estimated_unit_value}
                      hint="Opcional."
                      error={errors.lines[index]?.estimated_unit_value}
                      onChange={(event) => updateLine(line.id, "estimated_unit_value", event.target.value)}
                    />
                    {lines.length > 1 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={styles.remove}
                        aria-label={`Quitar artículo ${index + 1}`}
                        disabled={pending}
                        onClick={() => removeLine(line.id)}
                      >
                        <Icon name="trash" size={16} />
                        Quitar
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className={styles.actions}>
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
