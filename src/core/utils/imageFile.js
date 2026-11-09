/**
 * Restricciones de imágenes del backend (`POST/PATCH /products`, campo `image`):
 * solo estos tipos MIME y un máximo de 5 MB (límite de `multer` en
 * `product-routes.ts`, documentado en Swagger como «máximo 5 MB»).
 */
export const IMAGE_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Valor para el atributo `accept` de `<input type="file">`. */
export const IMAGE_ACCEPT = Object.keys(IMAGE_TYPES).join(",");

/** `JPG, PNG, WEBP, GIF o AVIF` */
export const IMAGE_FORMATS_LABEL = "JPG, PNG, WEBP, GIF o AVIF";

/**
 * Valida un archivo antes de enviarlo.
 * @param {File | null | undefined} file
 * @returns {string | null} Mensaje de error, o `null` si es válido.
 */
export function validateImageFile(file) {
  if (!file) return null;
  if (!(file.type in IMAGE_TYPES)) {
    return `Formato no permitido${file.type ? ` (${file.type})` : ""}. Usa ${IMAGE_FORMATS_LABEL}.`;
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return `La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)} MB; el máximo es 5 MB.`;
  }
  return null;
}
