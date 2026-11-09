import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClassName } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { describeError, paymentsService } from "@/core/api";
import { listPaymentSessions, paymentKindOf } from "@/core/utils/paymentSession";

import { STATUS_LABELS, formatCop, formatDateTime, outcomeOf } from "../PaymentResultPage/format.js";

import styles from "./MyOperationsPage.module.css";

const TONES = { approved: "green", rejected: "danger", pending: "neutral" };
const KIND_LABELS = { sale: "Compra", donation: "Donación" };
const KIND_ICONS = { sale: "bag", donation: "heart" };

/**
 * Página `/mis-operaciones`: compras y donaciones monetarias iniciadas en este
 * navegador, con su estado real consultado al backend
 * (`GET /api/v1/payments/:reference`). El backend aún no ofrece un listado de
 * operaciones por usuario, por eso la lista sale de las referencias guardadas
 * al pagar en este navegador.
 * @param {{ userId?: string | null }} props
 */
export function MyOperationsPage({ userId = null }) {
  const [rows, setRows] = useState(() => listPaymentSessions(userId).map((session) => ({ session, state: "loading" })));

  /** Consulta el estado de cada referencia y actualiza su fila al responder. */
  const fetchStatuses = useCallback((sessions) => {
    const patch = (reference, change) =>
      setRows((current) => current.map((row) => (row.session.reference === reference ? { ...row, ...change } : row)));
    sessions.forEach(({ reference }) => {
      paymentsService
        .getStatus(reference)
        .then((payment) => patch(reference, { state: "ready", payment }))
        .catch((error) =>
          patch(reference, {
            state: "error",
            error: error?.status === 404 ? "No encontrado" : describeError(error).message,
          }),
        );
    });
  }, []);

  useEffect(() => {
    fetchStatuses(listPaymentSessions(userId));
  }, [userId, fetchStatuses]);

  function refresh() {
    const sessions = listPaymentSessions(userId);
    setRows(sessions.map((session) => ({ session, state: "loading" })));
    fetchStatuses(sessions);
  }

  return (
    <Container className={styles.page}>
      <PageHeader
        eyebrow="Tu cuenta"
        title="Mis operaciones"
        description="Compras y donaciones monetarias que iniciaste, con el estado que confirma el servidor."
        actions={
          rows.length > 0 ? (
            <Button variant="outline" onClick={refresh}>
              <Icon name="refresh" size={18} />
              Actualizar estados
            </Button>
          ) : null
        }
      />

      <Alert tone="info">
        Por ahora esta lista muestra las operaciones iniciadas desde <strong>este navegador</strong>. Si pagaste
        desde otro dispositivo, consulta allí su estado.
      </Alert>

      {rows.length === 0 ? (
        <EmptyState
          icon="receipt"
          tone="brand"
          title="Aún no tienes operaciones"
          description="Cuando compres en la tienda o hagas una donación monetaria, verás aquí su estado y su comprobante."
          actions={
            <>
              <Link to="/apoyanos-tienda" className={buttonClassName()}>
                Visitar la tienda
              </Link>
              <Link to="/" className={buttonClassName({ variant: "outline" })}>
                Ir al inicio para donar
              </Link>
            </>
          }
        />
      ) : (
        <ul className={styles.list}>
          {rows.map(({ session, state, payment, error }) => {
            const kind = paymentKindOf(session.reference) ?? session.kind;
            const outcome = payment ? outcomeOf(payment) : null;
            return (
              <li key={session.reference} className={styles.row}>
                <span className={styles.kindIcon}>
                  <Icon name={KIND_ICONS[kind] ?? "receipt"} size={20} />
                </span>
                <div className={styles.main}>
                  <div className={styles.titleRow}>
                    <h2 className={styles.kind}>{KIND_LABELS[kind] ?? "Pago"}</h2>
                    {state === "loading" ? <Badge>Consultando…</Badge> : null}
                    {state === "error" ? <Badge tone="danger">{error}</Badge> : null}
                    {payment ? <Badge tone={TONES[outcome]}>{STATUS_LABELS[payment.status] ?? payment.status}</Badge> : null}
                  </div>
                  {session.summary ? <p className={styles.summary}>{session.summary}</p> : null}
                  <dl className={styles.details}>
                    <div>
                      <dt>Fecha</dt>
                      <dd>{formatDateTime(payment?.created_at ?? session.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>Referencia</dt>
                      <dd className={styles.mono}>{session.reference}</dd>
                    </div>
                    {payment?.payment_method ? (
                      <div>
                        <dt>Medio de pago</dt>
                        <dd>{payment.payment_method}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
                <div className={styles.side}>
                  {payment ? <p className={styles.amount}>{formatCop(payment.amount_in_cents / 100)}</p> : null}
                  <Link
                    to={`/payment-result?reference=${encodeURIComponent(session.reference)}`}
                    className={buttonClassName({ variant: "outline", size: "sm" })}
                  >
                    Ver detalle
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
