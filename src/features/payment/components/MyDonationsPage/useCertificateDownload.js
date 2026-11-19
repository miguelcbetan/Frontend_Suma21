import { useState } from "react";

import { describeError } from "@/core/api";
import { downloadBlob } from "@/core/utils/downloadFile";

/**
 * Descarga de certificados PDF del backend con un indicador por fila.
 * `generating` es la clave de la fila que se está descargando (o `null`).
 */
export function useCertificateDownload() {
  const [generating, setGenerating] = useState(null);
  const [error, setError] = useState("");

  /**
   * @param {string} key Identifica la fila (para mostrar «Generando…»).
   * @param {() => Promise<Blob>} fetchPdf
   * @param {string} filename
   */
  async function download(key, fetchPdf, filename) {
    if (generating) return;
    setGenerating(key);
    setError("");
    try {
      downloadBlob(await fetchPdf(), filename);
    } catch (caught) {
      setError(`No pudimos generar el certificado: ${describeError(caught).message}`);
    } finally {
      setGenerating(null);
    }
  }

  return { generating, error, clearError: () => setError(""), download };
}
