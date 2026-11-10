import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClassName } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { describeError } from "@/core/api";
import { lastPaymentReference, loadPaymentSession, paymentKindOf } from "@/core/utils/paymentSession";

import { CertificateDocument } from "../CertificateDocument";

import { STATUS_LABELS, formatCop, formatDateTime, outcomeOf } from "./format.js";
import styles from "./PaymentResultPage.module.css";
import { usePaymentStatus } from "./usePaymentStatus.js";

/*
 * PENDIENTE DE CONTENIDO: se ocultaron hasta confirmar su veracidad el bloque
 * «¿A dónde va tu aporte?» (3 módulos), el testimonio con foto, la línea
 * «Cifrado seguro SSL de 256 bits» y el botón «Enviar copia a mi correo»
 * (el servidor no envía correos).
 */

const TONE_ICON = { error: "alert", info: "clock" };

/** Mensaje para los pagos que todavía no tienen recibo. */
function PaymentStatusMessage({ tone, title, children, reference, action, extraAction, onRefresh }) {
  return (
    <EmptyState
      icon={TONE_ICON[tone] ?? "info"}
      tone={tone === "error" ? "danger" : "brand"}
      headingLevel={1}
      title={title}
      className={styles.status}
      description={
        <>
          {children ? <p>{children}</p> : null}
          {reference ? <p className={styles.reference}>Referencia del pago: {reference}</p> : null}
        </>
      }
      actions={
        <>
          {extraAction ?? null}
          {onRefresh ? (
            <Button onClick={onRefresh}>
              <Icon name="refresh" size={18} />
              Actualizar estado
            </Button>
          ) : null}
          {action ? (
            <Link to={action.to} className={buttonClassName({ variant: onRefresh ? "outline" : "primary" })}>
              {action.label}
            </Link>
          ) : null}
          <Link to="/mis-operaciones" className={buttonClassName({ variant: "outline" })}>
            Mis operaciones
          </Link>
          <Link to="/" className={buttonClassName({ variant: "ghost" })}>
            Ir al inicio
          </Link>
        </>
      }
    />
  );
}

/**
 * Tras un pago rechazado la venta queda DECLINED y sus productos no vuelven al
 * carrito: este botón los suma al carrito local y lleva a la tienda.
 */
function RestoreCartButton({ items, onRestore }) {
  const navigate = useNavigate();
  const [state, setState] = useState({ pending: false, error: "" });

  async function restore() {
    setState({ pending: true, error: "" });
    try {
      await onRestore(items);
      navigate("/apoyanos-tienda#carrito");
    } catch (error) {
      setState({ pending: false, error: describeError(error).message });
    }
  }

  return (
    <>
      <Button onClick={restore} disabled={state.pending}>
        <Icon name="cart" size={18} />
        {state.pending ? "Agregando…" : "Volver a agregar estos productos al carrito"}
      </Button>
      {state.error ? (
        <p role="alert" className={styles.reference}>
          {state.error}
        </p>
      ) : null}
    </>
  );
}

function ApprovedReceipt({ payment, kind, session }) {
  const [showCertificate, setShowCertificate] = useState(false);
  const isDonation = kind === "donation";
  // El backend no guarda el documento del donante: viene de lo que escribió al donar en este navegador.
  const donor =
    isDonation && session?.donorName && session?.donorDocument
      ? { name: session.donorName, document_number: session.donorDocument }
      : null;

  const amount = payment.amount_in_cents / 100;
  const paidAt = payment.created_at;
  const modality = isDonation ? "Donación monetaria" : "Compra en la tienda SUMA21";

  return (
    <>
      <section className={styles.thanks} aria-labelledby="thanks-title">
        <span className={styles.thanksIcon}>
          <Icon name={isDonation ? "heart" : "checkCircle"} size={34} />
        </span>
        <Badge tone="green">{isDonation ? "Aporte confirmado" : "Compra confirmada"}</Badge>
        <h1 id="thanks-title" className={styles.thanksTitle}>
          {isDonation ? "¡Gracias de corazón por transformar vidas!" : "¡Gracias por tu compra!"}
        </h1>
        <p className={styles.thanksText}>
          {isDonation
            ? "Tu aporte impulsa la autonomía, la formación artística y el empleo digno de jóvenes con síndrome de Down en Colombia."
            : "Tu compra apoya la autonomía, la formación artística y el empleo digno de jóvenes con síndrome de Down en Colombia."}
        </p>
      </section>

      <article className={styles.receipt} aria-labelledby="receipt-title">
        <header className={styles.receiptHeader}>
          <div>
            <p className={styles.receiptEyebrow}>Comprobante electrónico</p>
            <h2 id="receipt-title" className={styles.receiptTitle}>
              {isDonation ? "Recibo de donación" : "Recibo de compra"}
            </h2>
          </div>
          <Badge tone="green">
            <Icon name="check" size={14} />
            Aprobado
          </Badge>
        </header>
        <dl className={styles.details}>
          <div>
            <dt>Modalidad</dt>
            <dd>{modality}</dd>
          </div>
          {!isDonation && session?.summary ? (
            <div>
              <dt>Productos</dt>
              <dd>{session.summary}</dd>
            </div>
          ) : null}
          <div>
            <dt>Referencia</dt>
            <dd className={styles.mono}>{payment.reference}</dd>
          </div>
          <div>
            <dt>Fecha y hora de inicio del pago</dt>
            <dd>{formatDateTime(paidAt)}</dd>
          </div>
          <div>
            <dt>Método de pago</dt>
            <dd>{payment.payment_method ?? "—"}</dd>
          </div>
          <div className={styles.totalRow}>
            <dt>{isDonation ? "Monto aportado" : "Total pagado"}</dt>
            <dd className={styles.amount}>{formatCop(amount)}</dd>
          </div>
        </dl>
        <footer className={styles.receiptActions}>
          {isDonation ? (
            <Button disabled={!donor} onClick={() => setShowCertificate(true)}>
              <Icon name="receipt" size={18} />
              Ver certificado de donación
            </Button>
          ) : null}
          <Link to="/mis-operaciones" className={buttonClassName({ variant: "outline" })}>
            Mis operaciones
          </Link>
          <Link to="/" className={buttonClassName({ variant: "ghost" })}>
            Ir al inicio
          </Link>
        </footer>
        {isDonation && !donor ? (
          <p className={styles.hint}>
            El certificado se genera con el nombre y el documento que escribiste al donar, guardados en el
            navegador donde se hizo la donación.
          </p>
        ) : null}
      </article>

      {showCertificate && donor ? (
        <CertificateDocument
          donor={donor}
          amount={amount}
          paidAt={paidAt}
          onClose={() => setShowCertificate(false)}
        />
      ) : null}
    </>
  );
}

/**
 * Página `/payment-result`: estado del pago (`GET /api/v1/payments/:reference`).
 * Toma la referencia de `?reference=` o del último pago iniciado en este
 * navegador. Solo se da por aprobado lo que el backend confirma.
 * @param {{ onRestoreCart: (items: { productId: string, quantity: number }[]) => Promise<void> }} props
 */
export function PaymentResultPage({ onRestoreCart }) {
  const [params] = useSearchParams();
  const reference = params.get("reference") ?? lastPaymentReference();
  const { status, payment, message, timedOut } = usePaymentStatus(reference);
  const session = reference ? loadPaymentSession(reference) : null;
  const kind = paymentKindOf(payment?.reference ?? reference) ?? session?.kind ?? null;
  const outcome = status === "ready" ? outcomeOf(payment) : null;
  let content;
  if (status === "loading") {
    content = (
      <div className={styles.loading}>
        <p role="status" className={styles.loadingText}>
          Consultando tu pago…
        </p>
        <Skeleton height="4rem" width="4rem" radius="lg" />
        <Skeleton height="2rem" width="60%" />
        <Skeleton height="14rem" radius="lg" />
      </div>
    );
  } else if (status === "notfound") {
    content = (
      <PaymentStatusMessage tone="error" title="No encontramos el pago">
        {reference
          ? "No existe un pago con esa referencia."
          : "No hay un pago reciente en este navegador. Abre esta página desde el mismo navegador donde pagaste."}
      </PaymentStatusMessage>
    );
  } else if (status === "error") {
    content = (
      <PaymentStatusMessage
        tone="error"
        title="No pudimos consultar tu pago"
        reference={reference}
        onRefresh={() => window.location.reload()}
      >
        {message}
      </PaymentStatusMessage>
    );
  } else if (outcome === "approved") {
    content = <ApprovedReceipt payment={payment} kind={kind} session={session} />;
  } else if (outcome === "rejected") {
    content = (
      <PaymentStatusMessage
        tone="error"
        title="El pago no fue aprobado"
        reference={payment.reference}
        action={
          kind === "sale"
            ? { to: "/apoyanos-tienda", label: "Ir a la tienda" }
            : { to: "/", label: "Ir al inicio para donar de nuevo" }
        }
        extraAction={
          kind === "sale" && session?.items?.length ? (
            <RestoreCartButton items={session.items} onRestore={onRestoreCart} />
          ) : null
        }
      >
        {`Wompi informó el estado «${STATUS_LABELS[payment.status] ?? payment.status}». El cobro no se completó.`}
        {kind === "sale" ? " La compra se canceló y el stock reservado se liberó; puedes volver a armar tu pedido." : null}
      </PaymentStatusMessage>
    );
  } else {
    content = (
      <PaymentStatusMessage
        tone="info"
        title={timedOut ? "Tu pago sigue pendiente" : "Estamos confirmando tu pago con Wompi"}
        reference={payment.reference}
        onRefresh={timedOut ? () => window.location.reload() : undefined}
      >
        {timedOut
          ? "Aún no recibimos la confirmación de Wompi. Puedes volver más tarde o revisar el estado en «Mis operaciones»."
          : "Esta página se actualiza sola en unos segundos."}
      </PaymentStatusMessage>
    );
  }

  return (
    <div className={styles.page}>
      <Container className={styles.inner}>{content}</Container>
    </div>
  );
}
