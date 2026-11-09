import { cx } from "@/core/utils/cx";

import styles from "./Button.module.css";

/**
 * Clases de un botón. Permite que otros elementos (p. ej. un enlace)
 * adopten el mismo aspecto sin duplicar estilos.
 * @param {{
 *   variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "dangerSolid",
 *   size?: "sm" | "md" | "lg",
 *   block?: boolean,
 *   className?: string,
 * }} [options]
 */
export function buttonClassName({ variant = "primary", size = "md", block = false, className } = {}) {
  return cx(styles.button, styles[variant], styles[size], block && styles.block, className);
}

/**
 * Sustituible por un <button> nativo: acepta sus atributos y `ref`.
 * @param {import("react").ComponentPropsWithRef<"button"> & {
 *   variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "dangerSolid",
 *   size?: "sm" | "md" | "lg",
 *   block?: boolean,
 * }} props
 */
export function Button({ variant, size, block, type = "button", className, ...rest }) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, block, className })}
      {...rest}
    />
  );
}
