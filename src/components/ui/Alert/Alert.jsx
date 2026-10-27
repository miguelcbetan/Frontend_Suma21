import { cx } from "@/core/utils/cx";

import styles from "./Alert.module.css";

/**
 * Mensaje de estado. `error` se anuncia de inmediato (`role="alert"`);
 * `success` e `info` de forma cortés (`role="status"`).
 * @param {import("react").ComponentPropsWithRef<"div"> & {
 *   tone?: "error" | "success" | "info",
 * }} props
 */
export function Alert({ tone = "info", className, ...rest }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx(styles.alert, styles[tone], className)}
      {...rest}
    />
  );
}
