/**
 * Convierte un archivo en Base64 (p. ej. `certificate_pdf_base64`) en un `Blob`.
 * @param {string} base64
 * @param {string} [type]
 * @returns {Blob}
 */
export function base64ToBlob(base64, type = "application/pdf") {
  const binary = atob(base64.replace(/^data:[^,]*,/, ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type });
}

/**
 * Descarga un archivo generado en memoria (p. ej. un PDF del backend) con el
 * nombre indicado.
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Se libera después de que el navegador inicie la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
