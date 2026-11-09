/** Rol administrador: el único que el backend de datos distingue (`requireRole(["ADMIN"])`). */
export const ADMIN_ROLE = "ADMIN";

/**
 * Roles de la experiencia CUSTOMER (compras y donaciones del mismo usuario).
 * El servicio de autenticación registra a los clientes con `DONANTE`;
 * `CUSTOMER` se acepta por si el servicio lo incorpora.
 */
export const CUSTOMER_ROLES = ["DONANTE", "CUSTOMER"];

/** Rol con el que se registra una cuenta pública de cliente. */
export const REGISTER_ROLE = "DONANTE";

/** Roles que este portal acepta; el servicio de auth define otros (ESTUDIANTE, ACUDIENTE, TALLERISTA). */
export const ALLOWED_ROLES = [ADMIN_ROLE, ...CUSTOMER_ROLES];

const TOKEN_KEYS = ["token", "accessToken", "access_token", "jwt"];

/** @returns {string | null} */
export function pickToken(payload) {
  const key = TOKEN_KEYS.find((candidate) => typeof payload?.[candidate] === "string");
  return key ? payload[key] : null;
}

function looksLikeUser(value) {
  return Boolean(value) && typeof value === "object" && ("email" in value || "username" in value);
}

function toRoleName(role) {
  const name = typeof role === "string" ? role : (role?.nombre ?? role?.name ?? role?.rol);
  return typeof name === "string" ? name.toUpperCase() : null;
}

/**
 * Normaliza la respuesta de `/auth/login` o `/auth/perfil`, que puede traer el
 * usuario anidado (`usuario` / `user`) o en la raíz. El backend de datos toma
 * el comprador o donante del token, así que el frontend ya no envía este ID:
 * solo se usa para asociar los pagos guardados en este navegador.
 * @returns {{ id: string | null, username: string, email: string, roles: string[] } | null}
 */
export function pickUser(payload) {
  const raw = [payload?.usuario, payload?.user, payload?.data, payload].find(looksLikeUser);
  if (!raw) return null;

  const rawRoles = raw.roles ?? raw.rol ?? raw.role ?? payload?.roles ?? payload?.rol;
  const roles = [rawRoles].flat().map(toRoleName).filter(Boolean);
  const rawId = raw.id ?? raw.usuarioId;

  return {
    id: rawId != null ? String(rawId) : null,
    username: raw.username ?? raw.nombre ?? raw.email,
    email: raw.email ?? "",
    roles,
  };
}

/** @param {{ roles: string[] } | null | undefined} user */
export function hasAllowedRole(user) {
  return Boolean(user?.roles.some((role) => ALLOWED_ROLES.includes(role)));
}

/** @param {{ roles: string[] } | null | undefined} user @param {string} role */
export function hasRole(user, role) {
  return Boolean(user?.roles.includes(role));
}

/** @param {{ roles: string[] } | null | undefined} user */
export function isAdmin(user) {
  return hasRole(user, ADMIN_ROLE);
}

/** @param {{ roles: string[] } | null | undefined} user */
export function isCustomer(user) {
  return Boolean(user?.roles.some((role) => CUSTOMER_ROLES.includes(role)));
}
