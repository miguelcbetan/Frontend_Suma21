import { ApiError } from "./ApiError.js";

/**
 * Separa un error de la API en mensaje general y errores por campo.
 * Los detalles sobre `body` no pertenecen a ningún campo y van al mensaje.
 * @param {unknown} error
 * @returns {{ message: string, fields: Record<string, string> }}
 */
export function describeError(error) {
  if (!(error instanceof ApiError)) {
    return { message: "Ocurrió un error inesperado. Inténtalo de nuevo.", fields: {} };
  }

  const fields = {};
  const general = [];
  for (const { campo, mensaje } of error.details) {
    if (campo === "body") general.push(mensaje);
    else fields[campo] = mensaje;
  }

  if (general.length > 0) return { message: `${error.message}: ${general.join(" · ")}`, fields };
  if (Object.keys(fields).length > 0) return { message: "Revisa los datos del formulario.", fields };
  return { message: error.message, fields };
}
