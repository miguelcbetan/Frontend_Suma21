import styles from "./SiteHeader.module.css";

/**
 * @param {{
 *   items: { label: string, href: string, current?: boolean }[],
 *   onNavigate?: () => void,
 *   linkAs?: import("react").ElementType,
 * }} props
 */
export function NavList({ items, onNavigate, linkAs: Link = "a" }) {
  return (
    <ul className={styles.list}>
      {items.map(({ label, href, current }) => (
        <li key={href}>
          <Link
            className={styles.link}
            href={href}
            aria-current={current ? "page" : undefined}
            onClick={onNavigate}
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
