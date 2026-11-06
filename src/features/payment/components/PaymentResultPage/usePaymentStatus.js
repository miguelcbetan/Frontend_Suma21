import { useEffect, useState } from "react";

import { describeError, paymentsService } from "@/core/api";

import { outcomeOf } from "./format.js";

const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 40;

const LOADING = { status: "loading", payment: null, message: "", timedOut: false };

/**
 * Consulta `GET /api/payments/:reference` y repite la consulta mientras el pago
 * siga pendiente (Wompi confirma por un evento que puede tardar unos segundos).
 * @param {string | null} reference
 * @returns {{
 *   status: "loading" | "ready" | "notfound" | "error",
 *   payment: Awaited<ReturnType<typeof paymentsService.getStatus>> | null,
 *   message: string,
 *   timedOut: boolean,
 * }}
 */
export function usePaymentStatus(reference) {
  const [state, setState] = useState(LOADING);

  useEffect(() => {
    if (!reference) return undefined;

    let cancelled = false;
    let timer;
    let attempts = 0;
    const controller = new AbortController();

    async function poll() {
      try {
        const payment = await paymentsService.getStatus(reference, { signal: controller.signal });
        if (cancelled) return;
        attempts += 1;
        const waiting = outcomeOf(payment) === "pending";
        const timedOut = waiting && attempts >= MAX_ATTEMPTS;
        setState({ status: "ready", payment, message: "", timedOut });
        if (waiting && !timedOut) timer = setTimeout(poll, POLL_INTERVAL_MS);
      } catch (error) {
        if (cancelled || error?.name === "AbortError") return;
        setState({
          status: error?.status === 404 ? "notfound" : "error",
          payment: null,
          message: describeError(error).message,
          timedOut: false,
        });
      }
    }

    poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [reference]);

  return reference ? state : { ...LOADING, status: "notfound" };
}
