import { Badge } from "@/components/ui/Badge";

import styles from "./DataTable.module.css";

function renderCell(column, record) {
  if (column.type === "image") {
    const url = record[column.key];
    return url ? <img src={url} alt="" className={styles.thumb} loading="lazy" /> : <span className={styles.muted}>—</span>;
  }
  if (column.type === "flag") {
    return record[column.key] ? (
      <Badge tone="orange">{column.trueLabel ?? "Sí"}</Badge>
    ) : (
      <span className={styles.muted}>{column.falseLabel ?? "No"}</span>
    );
  }
  if (column.type === "status") {
    const raw = record[column.key];
    const text = column.format ? column.format(record) : raw;
    return <Badge tone={column.tones?.[raw] ?? "neutral"}>{text}</Badge>;
  }
  const value = column.format ? column.format(record) : record[column.key];
  return value == null || value === "" ? <span className={styles.muted}>—</span> : String(value);
}

/**
 * Tabla administrativa. En escritorio es una tabla con desplazamiento
 * horizontal si hace falta; en móvil cada fila se muestra como una tarjeta
 * con la etiqueta de cada dato (`data-label`).
 * @param {{
 *   caption: string,
 *   columns: { key: string, label: string, type?: string, format?: (record: any) => unknown, tones?: Record<string, string> }[],
 *   records: any[],
 *   rowKey?: (record: any) => string,
 *   actions?: (record: any) => import("react").ReactNode,
 * }} props
 */
export function DataTable({ caption, columns, records, rowKey = (record) => String(record.id), actions }) {
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- región desplazable accesible por teclado
    <div className={styles.scroll} tabIndex={0} role="region" aria-label={caption}>
      <table className={styles.table}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
            {actions ? (
              <th scope="col" className={styles.actionsHead}>
                Acciones
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={rowKey(record)}>
              {columns.map((column) => (
                <td key={column.key} data-label={column.label} className={column.key === "id" ? styles.idCell : undefined}>
                  {renderCell(column, record)}
                </td>
              ))}
              {actions ? (
                <td className={styles.actionsCell} data-label="Acciones">
                  <div className={styles.actions}>{actions(record)}</div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
