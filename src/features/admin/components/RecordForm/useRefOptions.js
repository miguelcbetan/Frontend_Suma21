import { useEffect, useState } from "react";

import { toList } from "@/core/api";

import { REF_SOURCES } from "../../resources.js";

/**
 * Carga las opciones de una lista desplegable de IDs.
 * @param {keyof typeof REF_SOURCES} source
 * @returns {{ status: "loading" | "ready" | "error", options: { value: string, label: string }[] }}
 */
export function useRefOptions(source) {
  const [state, setState] = useState({ status: "loading", options: [] });

  useEffect(() => {
    let cancelled = false;
    const { service, label } = REF_SOURCES[source];

    service
      .list()
      .then((payload) => {
        if (cancelled) return;
        const options = toList(payload).map((record) => ({
          value: String(record.id),
          label: `${label(record) ?? "Sin nombre"} (#${record.id})`,
        }));
        setState({ status: "ready", options });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", options: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [source]);

  return state;
}
