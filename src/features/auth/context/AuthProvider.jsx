import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ApiError,
  authService,
  clearToken,
  getToken,
  setToken,
  setUnauthorizedHandler,
} from "@/core/api";

import { hasAllowedRole, pickToken, pickUser } from "../session.js";

import { AuthContext } from "./authContext.js";

const NO_ACCESS_MESSAGE =
  "Tu cuenta no tiene acceso a este portal. Solo se admiten cuentas de administración y de clientes (DONANTE).";

/** Mantiene la sesión: restaura el token guardado y expone login, registro y logout. */
export function AuthProvider({ children }) {
  const [state, setState] = useState(() => ({
    status: getToken() ? "loading" : "anonymous",
    user: null,
  }));

  /** Descarta la sesión solo en este navegador. */
  const clearSession = useCallback(() => {
    clearToken();
    setState({ status: "anonymous", user: null });
  }, []);

  /** Invalida el token en el servidor (sin esperar la respuesta) y descarta la sesión local. */
  const logout = useCallback(() => {
    if (getToken()) authService.logout().catch(() => {});
    clearSession();
  }, [clearSession]);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    if (!getToken()) return undefined;

    let cancelled = false;
    authService
      .profile()
      .then((payload) => {
        const user = pickUser(payload);
        if (cancelled) return;
        if (hasAllowedRole(user)) {
          setState({ status: "authenticated", user });
        } else {
          clearSession();
        }
      })
      .catch((error) => {
        if (cancelled) return;
        // Un fallo de red no invalida el token; un rechazo del servidor sí.
        if (error instanceof ApiError && error.status === 0) {
          setState({ status: "anonymous", user: null });
        } else {
          clearSession();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const login = useCallback(
    async ({ email, clave }) => {
      const payload = await authService.login({ email, clave });
      const token = pickToken(payload);
      if (!token) throw new ApiError("El servidor no devolvió un token de sesión.");

      setToken(token);
      try {
        const user = pickUser(payload) ?? pickUser(await authService.profile());
        if (!hasAllowedRole(user)) throw new ApiError(NO_ACCESS_MESSAGE, { status: 403 });
        setState({ status: "authenticated", user });
        return user;
      } catch (error) {
        clearToken();
        throw error;
      }
    },
    [],
  );

  /** Crea la cuenta (rol DONANTE) e inicia sesión con las mismas credenciales. */
  const register = useCallback(
    async ({ username, email, clave }) => {
      await authService.register({ username, email, clave });
      return login({ email, clave });
    },
    [login],
  );

  const value = useMemo(() => ({ ...state, login, register, logout }), [state, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
