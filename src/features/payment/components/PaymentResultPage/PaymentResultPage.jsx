import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { Alert } from "@/components/ui/Alert";
import { buttonClassName } from "@/components/ui/Button";
import { customersService } from "@/core/api";
import { lastPaymentReference, loadPaymentSession } from "@/core/utils/paymentSession";

import { CertificateDocument } from "../CertificateDocument";

import { formatCop, formatDateTime, outcomeOf, paymentMethodLabel } from "./format.js";
import styles from "./PaymentResultPage.module.css";
import { usePaymentStatus } from "./usePaymentStatus.js";

const IMPACT_ITEMS = ["3 Semanas de Formación Barista", "Materiales Adaptados de Pintura", "Acompañamiento Psicosocial"];

/** Datos del donante para el certificado; solo se piden con un pago de donación aprobado. */
function useDonor(personId, enabled) {
  const [donor, setDonor] = useState(null);

  useEffect(() => {
    if (!enabled || !personId) return undefined;
    let cancelled = false;
    customersService
      .get(personId)
      .then((record) => !cancelled && setDonor(record))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled, personId]);

  return donor;
}

/** Mensaje para los pagos que todavía no tienen recibo. */
function PaymentStatusMessage({ tone, title, children, reference, retryTo, onRefresh }) {
  return (
    <div className={styles.status}>
      <Alert tone={tone}>
        <strong>{title}</strong>
        {children ? <p>{children}</p> : null}
      </Alert>
      {reference ? <p className={styles.reference}>Referencia del pago: {reference}</p> : null}
      <div className={styles.statusActions}>
        {onRefresh ? (
          <button type="button" className={buttonClassName({ variant: "secondary" })} onClick={onRefresh}>
            Actualizar estado
          </button>
        ) : null}
        {retryTo ? (
          <Link to={retryTo} className={buttonClassName({ variant: "secondary" })}>
            Volver a intentarlo
          </Link>
        ) : null}
        <Link to="/" className={buttonClassName({ variant: "ghost" })}>
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}

function ApprovedReceipt({ payment, session }) {
  const [showCertificate, setShowCertificate] = useState(false);
  const isDonation = payment.kind === "donation";
  const donor = useDonor(session?.personId, isDonation);

  const amount = payment.amount_in_cents / 100;
  const paidAt = payment.completed_at ?? payment.created_at;
  const modality = isDonation
    ? session?.frequency === "once"
      ? "Donación única"
      : session?.frequency === "monthly"
        ? "Donación mensual"
        : "Donación"
    : "Compra en la tienda SUMA21";

  return (
    <>
      <section className={styles.thanks}>
        <div className={styles.heart}>
          ♥<i>✓</i>
        </div>
        <p className={styles.badge}>
          {isDonation ? "Aporte confirmado · impacto inmediato" : "Compra confirmada"}
        </p>
        <h1>
          {isDonation ? (
            <>
              ¡Gracias de corazón por
              <br />
              transformar vidas!
            </>
          ) : (
            <>¡Gracias por tu compra!</>
          )}
        </h1>
        <p className={styles.thanksText}>
          {isDonation
            ? "Tu aporte impulsa la autonomía, formación artística y empleo digno de jóvenes con síndrome de Down Colombia."
            : "Tu compra apoya la autonomía, formación artística y empleo digno de jóvenes con síndrome de Down en Colombia."}
        </p>
      </section>

      <section className={`${styles.receiptLayout} ${isDonation ? "" : styles.receiptLayoutSingle}`}>
        <article className={styles.receiptCard}>
          <div className={styles.receiptTitle}>
            <div>
              <small>COMPROBANTE OFICIAL ELECTRÓNICO</small>
              <h2>{isDonation ? "Recibo de Donación" : "Recibo de Compra"}</h2>
            </div>
            <span>Aprobado y confirmado</span>
          </div>
          <dl>
            <div>
              <dt>Modalidad del aporte</dt>
              <dd>{modality}</dd>
            </div>
            <div>
              <dt>Monto aportado</dt>
              <dd className={styles.amount}>{formatCop(amount)}</dd>
            </div>
            <div>
              <dt>Fecha y hora</dt>
              <dd>{formatDateTime(paidAt)}</dd>
            </div>
            <div>
              <dt>Método de pago</dt>
              <dd>{paymentMethodLabel(payment.payment_method_type)}</dd>
            </div>
            <div>
              <dt>Seguridad</dt>
              <dd>✓ Cifrado seguro SSL de 256 bits</dd>
            </div>
          </dl>
          <div className={styles.receiptActions}>
            {isDonation ? (
              <button
                type="button"
                className={styles.actionPrimary}
                disabled={!donor}
                onClick={() => setShowCertificate(true)}
              >
                ▣ Ver certificado de donación
              </button>
            ) : null}
            <button
              type="button"
              className={styles.actionGhost}
              disabled
              title="Aún no está disponible: el servidor no tiene envío de correos."
            >
              Enviar copia a mi correo
            </button>
          </div>
          {isDonation && !donor ? (
            <p className={styles.hint}>
              El certificado se genera con los datos del donante guardados en el navegador donde se hizo la
              donación.
            </p>
          ) : null}
        </article>

        {isDonation ? (
          <aside className={styles.impactCard}>
            <p className={styles.eyebrow}>TRANSPARENCIA TOTAL</p>
            <h2>¿A dónde va tu aporte?</h2>
            <p>
              Con tu aporte de {formatCop(amount)} aseguras directamente estos tres módulos de desarrollo:
            </p>
            {IMPACT_ITEMS.map((item, index) => (
              <div className={styles.impactItem} key={item}>
                <b>{index + 1}</b>
                <span>{item}</span>
              </div>
            ))}
          </aside>
        ) : null}
      </section>

      {isDonation ? (
        <blockquote className={styles.quote}>
          <div className={styles.quoteImage} role="img" aria-label="Foto de Mateo Gómez, aprendiz barista">
            [Foto]
          </div>
          <div>
            “Gracias por creer en mis capacidades. Cada día que aprendo en la cafetería estoy más cerca de mi
            sueño.”
            <cite>Mateo Gómez · Aprendiz Barista</cite>
          </div>
        </blockquote>
      ) : null}

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
 * Página `/payment-result`: estado del pago de Wompi (`GET /api/payments/:reference`).
 * Toma la referencia de `?reference=` o del último pago iniciado en este navegador.
 */
export function PaymentResultPage() {
  const [params] = useSearchParams();
  const reference = params.get("reference") ?? lastPaymentReference();
  const { status, payment, message, timedOut } = usePaymentStatus(reference);
  const session = reference ? loadPaymentSession(reference) : null;

  let content;
  if (status === "loading") {
    content = (
      <div className={styles.status}>
        <p role="status">Consultando tu pago…</p>
      </div>
    );
  } else if (status === "notfound") {
    content = (
      <PaymentStatusMessage tone="error" title="No encontramos el pago" retryTo="/">
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
  } else {
    const retryTo = payment.kind === "sale" ? "/apoyanos-tienda" : "/";
    const outcome = outcomeOf(payment);

    if (outcome === "approved") {
      content = <ApprovedReceipt payment={payment} session={session} />;
    } else if (outcome === "review") {
      content = (
        <PaymentStatusMessage tone="info" title="Tu pago fue aprobado, pero requiere revisión" reference={payment.reference}>
          {payment.processing_error ??
            "No pudimos registrar la operación de forma automática. Contacta a ASISCO con esta referencia."}
        </PaymentStatusMessage>
      );
    } else if (outcome === "rejected") {
      content = (
        <PaymentStatusMessage
          tone="error"
          title="El pago no fue aprobado"
          reference={payment.reference}
          retryTo={retryTo}
        >
          {`Wompi respondió con el estado ${payment.wompi_status}.`}
        </PaymentStatusMessage>
      );
    } else if (outcome === "failed") {
      content = (
        <PaymentStatusMessage tone="error" title="No se pudo crear el pago" reference={payment.reference} retryTo={retryTo} />
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
            ? "Aún no recibimos la confirmación. Puedes volver a esta página más tarde con el botón de actualizar."
            : "Esta página se actualiza sola en unos segundos."}
        </PaymentStatusMessage>
      );
    }
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>{content}</main>
    </div>
  );
}
