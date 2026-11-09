import { Badge } from "@/components/ui/Badge";

import styles from "./DataTable.module.css";

function renderCell(column, record) {
  if (column.type === "image") {
    const url = record[column.key];
    return url ? <img src={url} alt="" className={styles.thumb} loading="lazy" /> : "—";
  }
  if (column.type === "flag") {
    return record[column.key] ? (
      <Badge tone="orange">{column.trueLabel ?? "Sí"}</Badge>
    ) : (
      <span className={styles.muted}>{column.falseLabel ?? "No"}</span>
    );
  }
  const value = column.format ? column.format(record) : record[column.key];
  return value == null || value === "" ? "—" : String(value);
}

/**
 * Tabla administrativa con desplazamiento horizontal en pantallas pequeñas.
 * @param {{
 *   caption: string,
 *   columns: { key: string, label: string, type?: string, format?: (record: any) => unknown }[],
 *   records: any[],
 *   rowKey?: (record: any) => string,
 *   actions?: (record: any) => import("react").ReactNode,
 * }} props
 */
export function DataTable({ caption, columns, records, rowKey = (record) => String(record.id), actions }) {
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
            {actions ? <th scope="col">Acciones</th> : null}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={rowKey(record)}>
              {columns.map((column) => (
                <td key={column.key} data-label={column.label}>
                  {renderCell(column, record)}
                </td>
              ))}
              {actions ? <td className={styles.actions}>{actions(record)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
