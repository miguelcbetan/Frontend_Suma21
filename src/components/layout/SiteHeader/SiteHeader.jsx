import { useEffect, useId, useRef, useState } from "react";

import { Container } from "@/components/layout/Container";
import { cx } from "@/core/utils/cx";

import { NavList } from "./NavList.jsx";
import styles from "./SiteHeader.module.css";

/**
 * Cabecera con marca, navegación principal y acciones. No conoce rutas ni
 * features: todo llega por props o slots.
 * @param {{
 *   brand: import("react").ReactNode,
 *   items: { label: string, href: string, current?: boolean }[],
 *   leading?: import("react").ReactNode,
 *   actions?: import("react").ReactNode,
 *   navLabel?: string,
 *   linkAs?: import("react").ElementType,
 * }} props
 */
export function SiteHeader({ brand, items, leading, actions, navLabel = "Principal", linkAs }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toggleRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function closeOnEscape(event) {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <header className={styles.header}>
      <Container className={styles.bar}>
        {leading ? <div className={styles.leading}>{leading}</div> : null}
        <div className={styles.brand}>{brand}</div>
        <button
          ref={toggleRef}
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((value) => !value)}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
            <path
              d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <div id={panelId} className={cx(styles.panel, open && styles.open)}>
          <nav aria-label={navLabel}>
            <NavList items={items} onNavigate={() => setOpen(false)} linkAs={linkAs} />
          </nav>
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>
      </Container>
    </header>
  );
}
