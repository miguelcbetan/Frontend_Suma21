import { useContext } from "react";

import { AuthContext } from "./authContext.js";

/** Estado de sesión y acciones de autenticación. Requiere `AuthProvider`. */
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth debe usarse dentro de <AuthProvider>.");
  return value;
}
