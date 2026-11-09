import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Grid } from "@/components/layout/Grid";
import { Section } from "@/components/layout/Section";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClassName } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { describeError, donationsService, inventoryService, toList } from "@/core/api";
import { todayISO } from "@/core/utils/date";

import styles from "./InKindDonationPage.module.css";

/**
 * Página de donaciones físicas: lista los artículos que la fundación necesita
 * (`GET /api/v1/inventory/needed`, público) y registra la donación del usuario
 * con sesión (`POST /api/v1/donations/inkind`). El cliente solo elige artículos
 * existentes: la lista la administra la fundación desde el panel de administración.
 * @param {{ session?: { authenticated: boolean } }} props
 */
export function InKindDonationPage({ session = { authenticated: false } }) {
  const [needed, setNeeded] = useState({ status: "loading", items: [], error: "" });
  const [selection, setSelection] = useState({});
  const [notes, setNotes] = useState("");
  const [submit, setSubmit] = useState({ status: "idle", message: "", errors: {} });

  const fetchNeeded = useCallback(
    () =>
      inventoryService
        .listNeeded()
        .then((payload) => setNeeded({ status: "ready", items: toList(payload), error: "" }))
        .catch((error) => setNeeded({ status: "error", items: [], error: describeError(error).message })),
    [],
  );

  useEffect(() => {
    fetchNeeded();
  }, [fetchNeeded]);

  function reload() {
    setNeeded((current) => ({ ...current, status: "loading", error: "" }));
    fetchNeeded();
  }

  const byId = new Map(needed.items.map((item) => [String(item.id), item]));
  const selected = Object.entries(selection).filter(([id]) => byId.has(id));
  const pending = submit.status === "pending";

  function select(id) {
    setSelection((current) => (id in current ? current : { ...current, [id]: "1" }));
    setSubmit({ status: "idle", message: "", errors: {} });
  }

  function unselect(id) {
    setSelection((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== id)));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = {};
    const items = selected.map(([id, raw]) => {
      const quantity = Number(raw);
      if (!Number.isInteger(quantity) || quantity < 1) errors[id] = "Escribe una cantidad entera mayor que cero.";
      return { inventory_item_id: id, quantity };
    });
    if (items.length === 0) {
      setSubmit({ status: "error", message: "Elige al menos un artículo de la lista.", errors: {} });
      return;
    }
    if (Object.keys(errors).length > 0) {
      setSubmit({ status: "error", message: "Revisa las cantidades.", errors });
      return;
    }

    setSubmit({ status: "pending", message: "", errors: {} });
    try {
      const { donationId } = await donationsService.createInKind({
        donation_date: todayISO(),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        items,
      });
      setSelection({});
      setNotes("");
      setSubmit({
        status: "success",
        message: `¡Gracias! Registramos tu donación en especie n.º ${donationId} con ${items.length} ${items.length === 1 ? "artículo" : "artículos"}.`,
        errors: {},
      });
      fetchNeeded();
    } catch (error) {
      setSubmit({ status: "error", message: describeError(error).message, errors: {} });
    }
  }

  return (
    <Section
      eyebrow="Donaciones en especie"
      title="Lo que la fundación necesita"
      description="Estos son los artículos que la fundación está solicitando. Elige los que puedes aportar e indica la cantidad."
    >
      <div className={styles.layout}>
        <div className={styles.list}>
          {needed.status === "loading" ? <p role="status">Cargando artículos solicitados…</p> : null}
          {needed.status === "error" ? (
            <div className={styles.errorBox}>
              <Alert tone="error">{needed.error}</Alert>
              <Button variant="secondary" size="sm" onClick={reload}>
                Reintentar
              </Button>
            </div>
          ) : null}
          {needed.status === "ready" && needed.items.length === 0 ? (
            <Alert tone="info">Por ahora la fundación no tiene artículos solicitados. ¡Gracias por tu interés!</Alert>
          ) : null}
          {needed.items.length > 0 ? (
            <Grid columns={2}>
              {needed.items.map((item) => {
                const id = String(item.id);
                const isSelected = id in selection;
                return (
                  <Card key={id} className={styles.item}>
                    <CardBody className={styles.itemBody}>
                      <Badge tone="orange">Solicitado</Badge>
                      <h3 className={styles.itemTitle}>{item.name}</h3>
                      {item.description ? <p className={styles.itemDescription}>{item.description}</p> : null}
                      <Button
                        variant={isSelected ? "secondary" : "primary"}
                        size="sm"
                        onClick={() => (isSelected ? unselect(id) : select(id))}
                        aria-pressed={isSelected}
                        className={styles.itemAction}
                      >
                        {isSelected ? "Quitar de mi donación" : "Quiero donar esto"}
                      </Button>
                    </CardBody>
                  </Card>
                );
              })}
            </Grid>
          ) : null}
        </div>

        <aside className={styles.aside} aria-label="Tu donación en especie">
          {submit.status === "success" ? <Alert tone="success">{submit.message}</Alert> : null}
          <Card>
            <CardHeader>
              <h3 className={styles.heading}>Tu donación</h3>
            </CardHeader>
            <CardBody>
              {!session.authenticated ? (
                <div className={styles.gate}>
                  <p>Para registrar tu donación necesitas iniciar sesión.</p>
                  <Link
                    to="/login"
                    state={{ from: "/donaciones-en-especie" }}
                    className={buttonClassName({ variant: "secondary" })}
                  >
                    Iniciar sesión o crear cuenta
                  </Link>
                </div>
              ) : (
                <form className={styles.form} onSubmit={handleSubmit} noValidate>
                  {submit.status === "error" ? <Alert tone="error">{submit.message}</Alert> : null}
                  {selected.length === 0 ? (
                    <p className={styles.empty}>Elige artículos de la lista para agregarlos aquí.</p>
                  ) : (
                    <ul className={styles.selected}>
                      {selected.map(([id, quantity]) => (
                        <li key={id} className={styles.line}>
                          <Field
                            label={byId.get(id).name}
                            type="number"
                            inputMode="numeric"
                            min={1}
                            step={1}
                            required
                            value={quantity}
                            hint="Cantidad (unidades enteras)"
                            error={submit.errors[id]}
                            onChange={(event) => setSelection((current) => ({ ...current, [id]: event.target.value }))}
                          />
                          <Button variant="ghost" size="sm" onClick={() => unselect(id)}>
                            Quitar
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Field
                    as="textarea"
                    label="Notas para la fundación (opcional)"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    hint="Por ejemplo: estado de los artículos o cuándo puedes entregarlos."
                  />
                  <Button type="submit" disabled={pending || selected.length === 0}>
                    {pending ? "Registrando…" : "Registrar mi donación"}
                  </Button>
                </form>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </Section>
  );
}
