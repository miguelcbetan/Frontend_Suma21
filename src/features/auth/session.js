/** Roles que este portal acepta; el backend define otros (ESTUDIANTE, ACUDIENTE, TALLERISTA). */
export const ALLOWED_ROLES = ["ADMIN", "DONANTE"];

const TOKEN_KEYS = ["token", "accessToken", "access_token", "jwt"];
const DONOR_ID_KEYS = ["donor_id", "donante_id", "customer_id", "cliente_id"];

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
 * usuario anidado (`usuario` / `user`) o en la raíz.
 * @returns {{ id: string | null, username: string, email: string, roles: string[], donorId: string | null } | null}
 */
export function pickUser(payload) {
  const raw = [payload?.usuario, payload?.user, payload?.data, payload].find(looksLikeUser);
  if (!raw) return null;

  const rawRoles = raw.roles ?? raw.rol ?? raw.role ?? payload?.roles ?? payload?.rol;
  const roles = [rawRoles].flat().map(toRoleName).filter(Boolean);
  const donorKey = DONOR_ID_KEYS.find((key) => raw[key] != null);

  return {
    id: raw.id != null ? String(raw.id) : null,
    username: raw.username ?? raw.nombre ?? raw.email,
    email: raw.email ?? "",
    roles,
    donorId: donorKey ? String(raw[donorKey]) : null,
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
