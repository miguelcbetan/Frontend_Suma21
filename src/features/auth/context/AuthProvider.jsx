import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ApiError,
  authService,
  clearToken,
  getToken,
  setToken,
  setUnauthorizedHandler,
} from "@/core/api";

import { hasAllowedRole, pickToken, pickUser, readDocumentPending, storeDocumentPending } from "../session.js";

import { AuthContext } from "./authContext.js";

const NO_ACCESS_MESSAGE =
  "Tu cuenta no tiene acceso a este portal. Solo se admiten cuentas de administración y de clientes (DONANTE).";

/**
 * Mantiene la sesión: restaura el token guardado y expone login, registro,
 * logout y la verificación de documento que exige el backend a los donantes.
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState(() => ({
    status: getToken() ? "loading" : "anonymous",
    user: null,
  }));

  /** Descarta la sesión solo en este navegador. */
  const clearSession = useCallback(() => {
    clearToken();
    storeDocumentPending(false);
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
        const profile = pickUser(payload);
        if (cancelled) return;
        // El perfil no informa si falta el documento: se toma lo recordado en el login.
        const user = profile && { ...profile, requiresDocumentCompletion: readDocumentPending() };
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
        storeDocumentPending(user.requiresDocumentCompletion);
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

  /**
   * Registra el documento del usuario del token. El token y la sesión no
   * cambian: solo se marca la verificación como completa. Si el backend indica
   * que la cuenta ya tenía perfil (p. ej. se completó en otro navegador), se
   * trata igual que un éxito.
   */
  const completeDocument = useCallback(async ({ fullName, documentType, documentNumber }) => {
    try {
      await authService.completeDocument({
        full_name: fullName,
        document_type: documentType,
        document_number: documentNumber,
      });
    } catch (error) {
      if (!(error instanceof ApiError && error.code === "DONOR_PROFILE_ALREADY_LINKED")) throw error;
    }
    storeDocumentPending(false);
    setState((current) =>
      current.user ? { ...current, user: { ...current.user, requiresDocumentCompletion: false } } : current,
    );
  }, []);

  const value = useMemo(
    () => ({ ...state, login, register, logout, completeDocument }),
    [state, login, register, logout, completeDocument],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
