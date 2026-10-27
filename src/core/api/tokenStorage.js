const TOKEN_KEY = "suma21.token";

/** @returns {string | null} */
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** @param {string} token */
export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Almacenamiento no disponible (modo privado): la sesión dura lo que la pestaña.
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nada que limpiar.
  }
}
