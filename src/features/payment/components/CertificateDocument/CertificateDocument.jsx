import { useEffect, useId, useRef } from "react";

import { Logo } from "@/components/ui/Logo";
import { amountInWords } from "@/core/utils/amountInWords";

import { formatCop, formatLongDate, formatNumericDate } from "../PaymentResultPage/format.js";

import styles from "./CertificateDocument.module.css";

/**
 * Certificado de donación, listo para imprimir o guardar como PDF
 * (`window.print()`). El nombre y el documento vienen del cliente registrado
 * como donante; el texto institucional es el del documento oficial.
 * @param {{
 *   donor: { name: string, document_number: string },
 *   amount: number,
 *   paidAt: string,
 *   onClose: () => void,
 * }} props
 */
export function CertificateDocument({ donor, amount, paidAt, onClose }) {
  const titleId = useId();
  const backRef = useRef(null);
  const today = new Date().toISOString();
  const documentEnd = String(donor.document_number).replace(/\s+/g, "").slice(-4);

  useEffect(() => {
    backRef.current?.focus();
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className={styles.toolbar}>
        <button ref={backRef} type="button" className={styles.ghost} onClick={onClose}>
          ← Volver al comprobante
        </button>
        <button type="button" className={styles.primary} onClick={() => window.print()}>
          Descargar / imprimir PDF
        </button>
      </div>
      <article className={styles.paper}>
        <header className={styles.letterhead}>
          <div>
            <Logo />
            <small>¡No somos Down, somos UP!</small>
          </div>
          <time dateTime={today}>{formatNumericDate(today)}</time>
        </header>
        <p>
          El suscrito Contador Público de la <b>ASOCIACIÓN DE INTERÉS SOCIAL COMUNITARIO ASISCO</b>, entidad sin
          ánimo de lucro identificada con NIT 830.582.114-8, debidamente registrada y vigilada por los organismos
          competentes,
        </p>
        <h1 id={titleId}>CERTIFICA</h1>
        <p>
          Que la Asociación de Interés Social Comunitario ASISCO ha recibido del señor{" "}
          <b>{donor.name.toUpperCase()}</b>, identificado con cédula de ciudadanía terminada en{" "}
          <b>{documentEnd}</b>, la suma de{" "}
          <b>
            {amountInWords(amount)} ({formatCop(amount)})
          </b>
          , mediante donación realizada y consignada el día {formatLongDate(paidAt)}.
        </p>
        <p>
          Que ASISCO maneja los ingresos por donaciones mediante establecimientos financieros autorizados y cuenta
          con mecanismos de control que garantizan su trazabilidad y destinación.
        </p>
        <p>
          Que los recursos de esta donación serán destinados a programas sociales de la{" "}
          <b>ASOCIACIÓN DE INTERÉS SOCIAL COMUNITARIO ASISCO</b>, orientados a la formación laboral, arte,
          barismo inclusivo, acompañamiento psicosocial y autonomía de jóvenes con síndrome de Down y sus
          familias.
        </p>
        <p>
          De conformidad con la legislación tributaria vigente, esta certificación se expide como constancia de la
          donación recibida. Su aplicación fiscal deberá ser validada por el donante de acuerdo con su situación
          tributaria.
        </p>
        <p>Se expide a solicitud del interesado el {formatLongDate(today)}.</p>
        <div className={styles.signatures}>
          <div>
            <span className={styles.signature}>Juan Guillermo Osorio G.</span>
            <b>JUAN GUILLERMO OSORIO G.</b>
            <small>Revisor Fiscal · T.P. 106626-T</small>
          </div>
          <div>
            <span className={styles.signature}>Consuelo Giraldo</span>
            <b>CONSUELO GIRALDO ZULUAGA</b>
            <small>Representante Legal</small>
          </div>
        </div>
        <footer className={styles.footer}>
          <b>Calle 58 #23-30 · Manizales, Caldas, Colombia</b>
          <span>300 267 50 41 · contacto@asisco.org.co · asisco.org.co</span>
        </footer>
      </article>
    </div>
  );
}
