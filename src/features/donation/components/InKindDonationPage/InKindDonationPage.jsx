import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Section } from "@/components/layout/Section";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonClassName } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { describeError, donationsService, inventoryService, toList } from "@/core/api";
import { cx } from "@/core/utils/cx";
import { todayISO } from "@/core/utils/date";

import styles from "./InKindDonationPage.module.css";

const STEPS = ["Elige los artículos", "Indica las cantidades", "Registra tu donación"];

function ListSkeleton() {
  return (
    <div className={styles.grid} aria-hidden="true">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className={styles.skeletonCard}>
          <Skeleton height="1.25rem" width="60%" />
          <Skeleton height="0.875rem" />
          <Skeleton height="0.875rem" width="80%" />
          <Skeleton height="2.25rem" width="50%" />
        </div>
      ))}
    </div>
  );
}

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
      headingLevel={1}
      align="start"
    >
      <ol className={styles.steps} aria-label="Cómo donar en especie">
        {STEPS.map((step, index) => (
          <li key={step}>
            <span className={styles.stepNumber}>{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>

      <div className={styles.layout}>
        <div className={styles.list}>
          {needed.status === "ready" && needed.items.length > 0 ? (
            <p className={styles.count}>
              {needed.items.length} {needed.items.length === 1 ? "artículo solicitado" : "artículos solicitados"}
            </p>
          ) : null}

          {needed.status === "loading" ? (
            <>
              <p role="status" className="sr-only">
                Cargando artículos solicitados…
              </p>
              <ListSkeleton />
            </>
          ) : null}

          {needed.status === "error" ? (
            <EmptyState
              icon="alert"
              tone="danger"
              title="No pudimos cargar la lista"
              description={needed.error}
              actions={
                <Button variant="outline" onClick={reload}>
                  <Icon name="refresh" size={18} />
                  Reintentar
                </Button>
              }
            />
          ) : null}

          {needed.status === "ready" && needed.items.length === 0 ? (
            <EmptyState
              icon="package"
              tone="brand"
              title="Por ahora no hay artículos solicitados"
              description="¡Gracias por tu interés! Vuelve pronto o apoya con una donación monetaria."
            />
          ) : null}

          {needed.items.length > 0 ? (
            <ul className={styles.grid}>
              {needed.items.map((item) => {
                const id = String(item.id);
                const isSelected = id in selection;
                return (
                  <li key={id} className={cx(styles.item, isSelected && styles.itemSelected)}>
                    <div className={styles.itemHeader}>
                      <span className={styles.itemIcon}>
                        <Icon name={isSelected ? "check" : "package"} size={20} />
                      </span>
                      <h2 className={styles.itemTitle}>{item.name}</h2>
                    </div>
                    {item.description ? <p className={styles.itemDescription}>{item.description}</p> : null}
                    <Button
                      variant={isSelected ? "outline" : "secondary"}
                      size="sm"
                      onClick={() => (isSelected ? unselect(id) : select(id))}
                      aria-pressed={isSelected}
                      className={styles.itemAction}
                    >
                      {isSelected ? "Quitar de mi donación" : "Quiero donar esto"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        <aside className={styles.aside} aria-labelledby="inkind-summary-title">
          {submit.status === "success" ? <Alert tone="success">{submit.message}</Alert> : null}
          <div className={styles.panel}>
            <header className={styles.panelHeader}>
              <h2 id="inkind-summary-title" className={styles.heading}>
                <Icon name="gift" size={20} />
                Tu donación
              </h2>
              {selected.length > 0 ? (
                <span className={styles.selectedCount}>
                  {selected.length} {selected.length === 1 ? "artículo" : "artículos"}
                </span>
              ) : null}
            </header>
            <div className={styles.panelBody}>
              {!session.authenticated ? (
                <div className={styles.gate}>
                  <p>Para registrar tu donación necesitas iniciar sesión. Puedes revisar la lista sin cuenta.</p>
                  <Link
                    to="/login"
                    state={{ from: "/donaciones-en-especie" }}
                    className={buttonClassName({ block: true })}
                  >
                    Iniciar sesión o crear cuenta
                  </Link>
                </div>
              ) : (
                <form className={styles.form} onSubmit={handleSubmit} noValidate>
                  {submit.status === "error" ? <Alert tone="error">{submit.message}</Alert> : null}
                  {selected.length === 0 ? (
                    <p className={styles.empty}>
                      <Icon name="arrowLeft" size={18} />
                      Elige artículos de la lista para agregarlos aquí.
                    </p>
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
                  <Button type="submit" size="lg" block disabled={pending || selected.length === 0}>
                    {pending ? "Registrando…" : "Registrar mi donación"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </aside>
      </div>
    </Section>
  );
}
