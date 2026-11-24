import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { describeError } from "@/core/api";
import { cx } from "@/core/utils/cx";

import { RecordPicker } from "../RecordPicker";

import styles from "./StockForm.module.css";

/**
 * Opción «ajustar stock de un registro existente»: buscar y elegir el
 * registro, ver su stock actual e indicar si aumenta o disminuye unidades.
 * No crea registros nuevos.
 */
export function StockForm({ records, singular, flow, onDone, initialId = "" }) {
  const [selectedId, setSelectedId] = useState(initialId);
  const [operation, setOperation] = useState("increase");
  const [quantity, setQuantity] = useState("1");
  const [state, setState] = useState({ pending: false, error: "", fieldError: "" });

  const selected = records.find((record) => String(record.id) === selectedId) ?? null;
  const current = selected ? Number(selected[flow.stockKey] ?? 0) : 0;
  const amount = Number(quantity);
  const validAmount = Number.isInteger(amount) && amount >= 1;
  const next = operation === "increase" ? current + amount : current - amount;
  const previewNext = selected && validAmount ? Math.max(0, next) : null;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selected) {
      setState({ pending: false, error: `Elige el ${singular} al que quieres ajustar el stock.`, fieldError: "" });
      return;
    }
    if (!validAmount) {
      setState({ pending: false, error: "", fieldError: "Escribe una cantidad entera mayor que cero." });
      return;
    }
    if (operation === "decrease" && amount > current) {
      setState({ pending: false, error: "", fieldError: `No puedes descontar más de ${current} unidades.` });
      return;
    }

    setState({ pending: true, error: "", fieldError: "" });
    try {
      const updated = await flow.apply(selected, operation, amount);
      const after = updated?.[flow.stockKey] ?? next;
      setQuantity("1");
      setState({ pending: false, error: "", fieldError: "" });
      await onDone(`Stock de «${selected.name}» actualizado: ${current} → ${after} unidades.`);
    } catch (error) {
      setState({ pending: false, error: describeError(error).message, fieldError: "" });
    }
  }

  if (records.length === 0) {
    return <Alert tone="info">Aún no hay registros. Usa la opción «Registrar nuevo» para crear el primero.</Alert>;
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {selected ? (
        <div className={styles.current} aria-live="polite">
          <div className={styles.currentText}>
            <p className={styles.selectedLabel}>
              {singular.charAt(0).toUpperCase()}
              {singular.slice(1)} elegido · #{selected.id}
            </p>
            <p className={styles.name}>{selected.name}</p>
            {selected.description ? <p className={styles.description}>{selected.description}</p> : null}
            <div className={styles.meter}>
              <span className={styles.meterPill}>Actual: {current} uds</span>
              {previewNext !== null ? (
                <>
                  <span className={styles.arrow} aria-hidden="true">
                    →
                  </span>
                  <span className={cx(styles.meterPill, previewNext === 0 ? styles.meterZero : styles.meterNext)}>
                    Nuevo stock: {previewNext} uds{previewNext === 0 ? " (agotado)" : ""}
                  </span>
                </>
              ) : null}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSelectedId("")}>
            Cambiar
          </Button>
        </div>
      ) : (
        <RecordPicker records={records} singular={singular} stockKey={flow.stockKey} onSelect={setSelectedId} />
      )}

      <div className={styles.grid}>
        {flow.allowDecrease ? (
          <div className={styles.opGroup}>
            <span className={styles.opLabel}>Operación</span>
            <div className={styles.segmented} role="group" aria-label="Tipo de ajuste de stock">
              <button
                type="button"
                className={cx(styles.segButton, operation === "increase" && styles.segActiveIncrease)}
                aria-pressed={operation === "increase"}
                onClick={() => {
                  setOperation("increase");
                  setState((currentState) => ({ ...currentState, fieldError: "" }));
                }}
              >
                + Aumentar
              </button>
              <button
                type="button"
                className={cx(styles.segButton, operation === "decrease" && styles.segActiveDecrease)}
                aria-pressed={operation === "decrease"}
                disabled={selected && current === 0}
                onClick={() => {
                  setOperation("decrease");
                  setState((currentState) => ({ ...currentState, fieldError: "" }));
                }}
              >
                − Disminuir
              </button>
            </div>
          </div>
        ) : null}
        <Field
          label={operation === "increase" ? "Unidades a agregar" : "Unidades a descontar"}
          type="number"
          inputMode="numeric"
          min={1}
          max={operation === "decrease" && selected ? Math.max(1, current) : undefined}
          step={1}
          suffix="uds"
          required
          value={quantity}
          error={state.fieldError}
          onChange={(event) => {
            setQuantity(event.target.value);
            setState((currentState) => ({ ...currentState, fieldError: "" }));
          }}
        />
      </div>

      <div className={styles.footer}>
        <Button type="submit" disabled={state.pending || !selected}>
          {state.pending ? "Guardando…" : operation === "increase" ? "Aumentar stock" : "Disminuir stock"}
        </Button>
      </div>
    </form>
  );
}
