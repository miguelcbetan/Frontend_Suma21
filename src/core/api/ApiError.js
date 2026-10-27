/**
 * Error de una llamada al backend. `status` es 0 cuando no hubo respuesta
 * (red caída o servidor dormido). `details` replica `detalles` del backend:
 * `{ campo, mensaje }[]`.
 */
export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, code?: string, details?: { campo: string, mensaje: string }[] }} [options]
   */
  constructor(message, { status = 0, code, details = [] } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Mensaje listo para mostrar, con el detalle por campo si existe. */
  get fullMessage() {
    if (this.details.length === 0) return this.message;
    return `${this.message}: ${this.details.map((detail) => detail.mensaje).join(" · ")}`;
  }
}
