import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClassName } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiError, describeError, paymentsService, salesService } from "@/core/api";
import { cx } from "@/core/utils/cx";
import { checkoutUrlWithReturn, isWompiCheckoutUrl, reserveCheckoutTab } from "@/core/utils/wompiWidget";

import { formatCop, formatDateTime } from "../PaymentResultPage/format.js";

import styles from "./MyOperationsPage.module.css";

/** Estado del backend → etiqueta y tono de la insignia. */
const STATUS = {
  PENDING: { label: "Pendiente de pago", tone: "orange" },
  APPROVED: { label: "Pagada", tone: "green" },
  // El backend no distingue una compra cancelada de una rechazada: ambas quedan en DECLINED.
  DECLINED: { label: "Cancelada o rechazada", tone: "danger" },
  VOIDED: { label: "Anulada", tone: "neutral" },
  ERROR: { label: "Error en el pago", tone: "danger" },
};
const KIND = {
  SALE: { label: "Compra", icon: "bag" },
  DONATION: { label: "Donación", icon: "heart" },
};

/** Lista de `GET /payments/my-transactions`; rechaza respuestas con otra forma. */
async function fetchTransactions() {
  const payload = await paymentsService.listMine();
  if (!Array.isArray(payload)) throw new ApiError("El servidor respondió de forma inesperada al consultar tus operaciones.");
  return payload;
}

function ListSkeleton() {
  return (
    <div className={styles.list} aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <Skeleton key={n} height="7rem" radius="lg" />
      ))}
    </div>
  );
}

/**
 * Tarjeta de una operación. Las pendientes muestran «Continuar con el pago» y,
 * si son compras, «Cancelar transacción».
 */
function OperationCard({ transaction, busy, activeAction, onPay, onCancel }) {
  const { id, reference, type, amountInCents, status, createdAt, details } = transaction;
  const kind = KIND[type] ?? { label: "Pago", icon: "receipt" };
  const badge = STATUS[status] ?? { label: status, tone: "neutral" };
  const pending = status === "PENDING";
  const items = Array.isArray(details?.items) ? details.items : [];
  const paying = activeAction === "pay";
  const cancelling = activeAction === "cancel";

  return (
    <li className={cx(styles.row, pending && styles.pendingRow)}>
      <span className={cx(styles.kindIcon, pending && styles.kindIconPending)}>
        <Icon name={kind.icon} size={20} />
      </span>
      <div className={styles.main}>
        <div className={styles.titleRow}>
          <h3 className={styles.kind}>{kind.label}</h3>
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </div>
        {items.length > 0 ? (
          <ul className={styles.items} aria-label="Productos">
            {items.map((item) => (
              <li key={item.productId}>
                <span className={styles.qty}>{item.quantity} ×</span> {item.name}
              </li>
            ))}
          </ul>
        ) : null}
        <dl className={styles.details}>
          <div>
            <dt>Fecha</dt>
            <dd>{createdAt ? formatDateTime(createdAt) : "—"}</dd>
          </div>
          <div>
            <dt>Operación</dt>
            <dd className={styles.mono}>#{id}</dd>
          </div>
          {reference ? (
            <div>
              <dt>Referencia</dt>
              <dd className={styles.mono}>{reference}</dd>
            </div>
          ) : null}
        </dl>
      </div>
      <div className={styles.side}>
        <p className={styles.amount}>
          <span className="sr-only">Total: </span>
          {formatCop(Number(amountInCents ?? 0) / 100)}
        </p>
        <div className={styles.actions}>
          {pending ? (
            <>
              {transaction.checkoutUrl ? (
                <Button size="sm" onClick={() => onPay(transaction)} disabled={busy}>
                  <Icon name="coins" size={16} />
                  {paying ? "Abriendo Wompi…" : "Continuar con el pago"}
                </Button>
              ) : null}
              {type === "SALE" ? (
                <Button size="sm" variant="danger" onClick={() => onCancel(transaction)} disabled={busy}>
                  {cancelling ? "Cancelando…" : "Cancelar transacción"}
                </Button>
              ) : null}
            </>
          ) : reference ? (
            <Link
              to={`/payment-result?reference=${encodeURIComponent(reference)}`}
              className={buttonClassName({ variant: "outline", size: "sm" })}
            >
              Ver detalle
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/**
 * Página `/mis-operaciones`: compras y donaciones del usuario
 * (`GET /api/v1/payments/my-transactions`). Las pendientes de pago van primero,
 * con acciones para continuar en Wompi o cancelar la compra
 * (`POST /api/v1/sales/checkout/cancel`). El estado siempre lo da el backend.
 * @param {{ onOperationsChange?: () => void }} props Avisa a la app para
 *   revisar el bloqueo del carrito y recargarlo.
 */
export function MyOperationsPage({ onOperationsChange }) {
  const [data, setData] = useState({ status: "loading", items: [], error: "" });
  const [reloadKey, setReloadKey] = useState(0);
  const [active, setActive] = useState(null);
  const [notice, setNotice] = useState(null);
  const [confirm, setConfirm] = useState({ transaction: null, pending: false, error: "" });
  const notifyRef = useRef(onOperationsChange);

  useEffect(() => {
    notifyRef.current = onOperationsChange;
  });

  const applyList = useCallback((items) => {
    setData({ status: "ready", items, error: "" });
    notifyRef.current?.();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchTransactions()
      .then((items) => {
        if (!cancelled) applyList(items);
      })
      .catch((error) => {
        if (!cancelled) setData({ status: "error", items: [], error: describeError(error).message });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, applyList]);

  // El pago se hace en otra pestaña: al volver a esta, si había pendientes, se recarga la lista.
  const hasPending = data.items.some((item) => item.status === "PENDING");
  useEffect(() => {
    if (!hasPending) return undefined;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      fetchTransactions()
        .then(applyList)
        .catch(() => {});
    };
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, [hasPending, applyList]);

  const busy = active !== null || confirm.pending;

  function refresh() {
    setNotice(null);
    setData((current) => ({ ...current, status: "loading" }));
    setReloadKey((key) => key + 1);
  }

  /** Recarga la lista sin mostrar el esqueleto; los errores van al aviso. */
  async function reloadQuietly() {
    try {
      const items = await fetchTransactions();
      applyList(items);
      return items;
    } catch (error) {
      setNotice({ tone: "error", text: `No pudimos actualizar la lista: ${describeError(error).message}` });
      return null;
    }
  }

  async function continuePayment(transaction) {
    if (busy) return;
    // La pestaña se abre en el mismo clic para que el navegador no la bloquee.
    const tab = reserveCheckoutTab();
    setActive({ id: transaction.id, type: "pay" });
    setNotice(null);
    try {
      // Se vuelve a consultar para no usar un enlace viejo ni una operación ya resuelta.
      const items = await fetchTransactions();
      applyList(items);
      const current = items.find((item) => String(item.id) === String(transaction.id));
      if (!current || current.status !== "PENDING") {
        tab.close();
        setNotice({
          tone: "info",
          text: "Esta operación ya no está pendiente de pago. Actualizamos la lista con su estado actual.",
        });
        setActive(null);
        return;
      }
      if (!isWompiCheckoutUrl(current.checkoutUrl)) {
        tab.close();
        setNotice({
          tone: "error",
          text: "El servidor no entregó un enlace de pago válido para esta operación. Intenta de nuevo en unos minutos.",
        });
        setActive(null);
        return;
      }
      const url = checkoutUrlWithReturn(current.checkoutUrl, current.reference);
      if (tab.go(url)) {
        setNotice({
          tone: "info",
          text: "Abrimos el pago de Wompi en otra pestaña. Cuando termines, vuelve aquí para ver el estado actualizado.",
        });
      } else {
        setNotice({ tone: "info", text: "Tu navegador bloqueó la pestaña de pago.", url });
      }
      setActive(null);
    } catch (error) {
      tab.close();
      setNotice({ tone: "error", text: `No pudimos abrir el pago: ${describeError(error).message}` });
      setActive(null);
    }
  }

  function askCancel(transaction) {
    if (busy) return;
    setNotice(null);
    setConfirm({ transaction, pending: false, error: "" });
  }

  function closeConfirm() {
    if (confirm.pending) return;
    setConfirm({ transaction: null, pending: false, error: "" });
  }

  async function cancelTransaction() {
    if (confirm.pending || !confirm.transaction) return;
    const { transaction } = confirm;
    setConfirm({ transaction, pending: true, error: "" });
    setActive({ id: transaction.id, type: "cancel" });
    try {
      await salesService.cancelCheckout();
      setConfirm({ transaction: null, pending: false, error: "" });
      setNotice({
        tone: "success",
        text: "Cancelaste la compra. Los productos volvieron a tu carrito y ya puedes seguir comprando.",
      });
    } catch (error) {
      if (error?.code === "NO_PENDING_CHECKOUT" || error?.code === "SALE_CHECKOUT_CONFLICT") {
        setConfirm({ transaction: null, pending: false, error: "" });
        setNotice({
          tone: error.code === "NO_PENDING_CHECKOUT" ? "info" : "error",
          text:
            error.code === "NO_PENDING_CHECKOUT"
              ? "Esta compra ya no tenía un pago pendiente por cancelar. Revisa su estado actualizado."
              : "No se pudo cancelar: el pago ya fue aprobado o cambió de estado. Revisa su estado actualizado.",
        });
      } else {
        setConfirm({ transaction, pending: false, error: describeError(error).message });
      }
    } finally {
      await reloadQuietly();
      setActive(null);
    }
  }

  const pending = data.items.filter((item) => item.status === "PENDING");
  const history = data.items.filter((item) => item.status !== "PENDING");
  const renderCard = (transaction) => (
    <OperationCard
      key={transaction.id}
      transaction={transaction}
      busy={busy}
      activeAction={active && String(active.id) === String(transaction.id) ? active.type : null}
      onPay={continuePayment}
      onCancel={askCancel}
    />
  );

  return (
    <Container className={styles.page}>
      <PageHeader
        eyebrow="Tu cuenta"
        title="Mis operaciones"
        description="Tus compras y donaciones, con el estado que confirma el servidor."
        actions={
          data.status !== "loading" ? (
            <Button variant="outline" onClick={refresh} disabled={busy}>
              <Icon name="refresh" size={18} />
              Actualizar
            </Button>
          ) : null
        }
      />

      {notice ? (
        <Alert tone={notice.tone}>
          {notice.text}
          {notice.url ? (
            <>
              {" "}
              <a href={notice.url} target="_blank" rel="noopener noreferrer">
                Abrir el pago en Wompi
              </a>
            </>
          ) : null}
        </Alert>
      ) : null}

      {data.status === "loading" ? (
        <>
          <p role="status" className="sr-only">
            Cargando tus operaciones…
          </p>
          <ListSkeleton />
        </>
      ) : null}

      {data.status === "error" ? (
        <EmptyState
          icon="alert"
          tone="danger"
          title="No pudimos cargar tus operaciones"
          description={data.error}
          actions={
            <Button variant="outline" onClick={refresh}>
              <Icon name="refresh" size={18} />
              Reintentar
            </Button>
          }
        />
      ) : null}

      {data.status === "ready" && data.items.length === 0 ? (
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
      ) : null}

      {data.status === "ready" && pending.length > 0 ? (
        <section className={styles.section} aria-labelledby="ops-pending">
          <div className={styles.sectionHead}>
            <h2 id="ops-pending" className={styles.sectionTitle}>
              Requieren tu acción <span className={styles.count}>{pending.length}</span>
            </h2>
            <p className={styles.sectionText}>
              Completa el pago o cancela la compra. Mientras tengas una compra pendiente no podrás agregar productos
              al carrito.
            </p>
          </div>
          <ul className={styles.list}>{pending.map(renderCard)}</ul>
        </section>
      ) : null}

      {data.status === "ready" && history.length > 0 ? (
        <section className={styles.section} aria-labelledby="ops-history">
          <div className={styles.sectionHead}>
            <h2 id="ops-history" className={styles.sectionTitle}>
              Historial
            </h2>
          </div>
          <ul className={styles.list}>{history.map(renderCard)}</ul>
        </section>
      ) : null}

      <ConfirmDialog
        open={confirm.transaction !== null}
        title="¿Cancelar esta compra?"
        confirmLabel="Sí, cancelar compra"
        cancelLabel="Volver"
        pending={confirm.pending}
        error={confirm.error}
        onConfirm={cancelTransaction}
        onCancel={closeConfirm}
      >
        {confirm.transaction ? (
          <p>
            Se anulará el pago pendiente de{" "}
            <strong>{formatCop(Number(confirm.transaction.amountInCents ?? 0) / 100)}</strong>. Los productos volverán
            a tu carrito para que puedas modificarlos o pagar de nuevo.
          </p>
        ) : null}
      </ConfirmDialog>
    </Container>
  );
}
