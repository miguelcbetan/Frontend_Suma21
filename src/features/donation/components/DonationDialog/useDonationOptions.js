import { useEffect, useState } from "react";

import { accountsService, paymentMethodsService, toList } from "@/core/api";

const INITIAL = { status: "idle", paymentMethods: [], accounts: [] };

/**
 * Carga los métodos de pago y cuentas que exige `POST /api/donations/monetary`.
 * Solo consulta cuando `enabled` pasa a verdadero (diálogo abierto y sesión iniciada).
 * @param {boolean} enabled
 */
export function useDonationOptions(enabled) {
  const [state, setState] = useState(INITIAL);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    Promise.all([paymentMethodsService.list(), accountsService.list()])
      .then(([paymentMethods, accounts]) => {
        if (cancelled) return;
        setState({ status: "ready", paymentMethods: toList(paymentMethods), accounts: toList(accounts) });
      })
      .catch(() => {
        if (!cancelled) setState({ ...INITIAL, status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Mientras se consulta (o antes de hacerlo) se informa «cargando» sin guardar estado extra.
  return enabled && state.status === "idle" ? { ...INITIAL, status: "loading" } : state;
}
