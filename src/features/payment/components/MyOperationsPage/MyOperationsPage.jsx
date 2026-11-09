import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Container } from "@/components/layout/Container";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClassName } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { describeError, paymentsService } from "@/core/api";
import { listPaymentSessions, paymentKindOf } from "@/core/utils/paymentSession";

import { STATUS_LABELS, formatCop, formatDateTime, outcomeOf } from "../PaymentResultPage/format.js";

import styles from "./MyOperationsPage.module.css";

const TONES = { approved: "green", rejected: "orange", pending: "neutral" };
const KIND_LABELS = { sale: "Compra", donation: "Donación" };

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
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Mis operaciones</h1>
          <p className={styles.lead}>
            Compras y donaciones monetarias que iniciaste desde este navegador, con el estado que confirma el
            servidor.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={refresh} disabled={rows.length === 0}>
          Actualizar estados
        </Button>
      </header>

      {rows.length === 0 ? (
        <Alert tone="info">
          Aún no tienes operaciones registradas en este navegador.{" "}
          <Link to="/apoyanos-tienda">Visita la tienda</Link> o usa «Donar ahora».
        </Alert>
      ) : (
        <ul className={styles.list}>
          {rows.map(({ session, state, payment, error }) => {
            const kind = paymentKindOf(session.reference) ?? session.kind;
            const outcome = payment ? outcomeOf(payment) : null;
            return (
              <li key={session.reference}>
                <Card>
                  <CardHeader className={styles.cardHeader}>
                    <h2 className={styles.kind}>{KIND_LABELS[kind] ?? "Pago"}</h2>
                    {state === "loading" ? <Badge>Consultando…</Badge> : null}
                    {state === "error" ? <Badge tone="orange">{error}</Badge> : null}
                    {payment ? <Badge tone={TONES[outcome]}>{STATUS_LABELS[payment.status] ?? payment.status}</Badge> : null}
                  </CardHeader>
                  <CardBody>
                    <dl className={styles.details}>
                      <div>
                        <dt>Referencia</dt>
                        <dd>{session.reference}</dd>
                      </div>
                      {payment ? (
                        <div>
                          <dt>Monto</dt>
                          <dd>{formatCop(payment.amount_in_cents / 100)}</dd>
                        </div>
                      ) : null}
                      <div>
                        <dt>Fecha</dt>
                        <dd>{formatDateTime(payment?.created_at ?? session.createdAt)}</dd>
                      </div>
                      {session.summary ? (
                        <div>
                          <dt>Detalle</dt>
                          <dd>{session.summary}</dd>
                        </div>
                      ) : null}
                      {payment?.payment_method ? (
                        <div>
                          <dt>Medio de pago</dt>
                          <dd>{payment.payment_method}</dd>
                        </div>
                      ) : null}
                    </dl>
                    <Link
                      to={`/payment-result?reference=${encodeURIComponent(session.reference)}`}
                      className={buttonClassName({ variant: "ghost", size: "sm" })}
                    >
                      Ver detalle
                    </Link>
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
