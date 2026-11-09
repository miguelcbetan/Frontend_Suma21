import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { describeError } from "@/core/api";

import styles from "./StockForm.module.css";

/**
 * Opción «aumentar stock de un registro existente»: buscar y elegir el
 * registro, ver su stock actual e indicar la cantidad. No crea registros nuevos.
 * @param {{
 *   records: any[],
 *   singular: string,
 *   flow: {
 *     stockKey: string,
 *     allowDecrease: boolean,
 *     describe: (record: any) => string,
 *     apply: (record: any, operation: "increase" | "decrease", quantity: number) => Promise<any>,
 *   },
 *   onDone: (message: string) => Promise<void> | void,
 * }} props
 */
export function StockForm({ records, singular, flow, onDone }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [operation, setOperation] = useState("increase");
  const [quantity, setQuantity] = useState("1");
  const [state, setState] = useState({ pending: false, error: "", fieldError: "" });

  const term = query.trim().toLowerCase();
  const options = term
    ? records.filter((record) => `${record.id} ${record.name} ${record.description ?? ""}`.toLowerCase().includes(term))
    : records;
  const selected = records.find((record) => String(record.id) === selectedId) ?? null;
  const current = selected ? Number(selected[flow.stockKey] ?? 0) : 0;
  const amount = Number(quantity);
  const validAmount = Number.isInteger(amount) && amount >= 1;
  const next = operation === "increase" ? current + amount : current - amount;

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
      <div className={styles.grid}>
        <Field
          label={`Buscar ${singular}`}
          type="search"
          value={query}
          hint="Por nombre, descripción o ID."
          onChange={(event) => setQuery(event.target.value)}
        />
        <Field
          as="select"
          label={`${singular.charAt(0).toUpperCase()}${singular.slice(1)} existente`}
          required
          value={selectedId}
          hint={term ? `${options.length} coincidencia(s).` : `${records.length} registro(s).`}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          <option value="">Selecciona…</option>
          {options.map((record) => (
            <option key={record.id} value={String(record.id)}>
              #{record.id} · {flow.describe(record)}
            </option>
          ))}
        </Field>
      </div>

      {selected ? (
        <div className={styles.current} aria-live="polite">
          <p className={styles.name}>{selected.name}</p>
          {selected.description ? <p className={styles.description}>{selected.description}</p> : null}
          <p>
            Stock actual: <strong>{current}</strong>
            {validAmount ? (
              <>
                {" "}
                → después del ajuste: <strong>{next}</strong>
              </>
            ) : null}
          </p>
        </div>
      ) : null}

      <div className={styles.grid}>
        {flow.allowDecrease ? (
          <Field as="select" label="Operación" value={operation} onChange={(event) => setOperation(event.target.value)}>
            <option value="increase">Aumentar stock</option>
            <option value="decrease">Disminuir stock</option>
          </Field>
        ) : null}
        <Field
          label={operation === "increase" ? "Unidades a agregar" : "Unidades a descontar"}
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          required
          value={quantity}
          error={state.fieldError}
          onChange={(event) => setQuantity(event.target.value)}
        />
      </div>

      <div>
        <Button type="submit" disabled={state.pending || !selected}>
          {state.pending ? "Guardando…" : operation === "increase" ? "Aumentar stock" : "Disminuir stock"}
        </Button>
      </div>
    </form>
  );
}
