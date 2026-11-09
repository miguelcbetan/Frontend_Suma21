import { useEffect, useId, useRef, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { cx } from "@/core/utils/cx";

import styles from "./RecordPicker.module.css";

/** Minúsculas y sin tildes, carácter por carácter (conserva las posiciones del texto original). */
function fold(text) {
  return [...String(text ?? "")]
    .map((char) => char.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().charAt(0) || char)
    .join("");
}

/** Resalta la primera coincidencia de `term` (ya normalizado) dentro de `text`. */
function Highlight({ text, term }) {
  const value = String(text ?? "");
  const index = term ? fold(value).indexOf(term) : -1;
  if (index < 0) return value;
  return (
    <>
      {value.slice(0, index)}
      <mark className={styles.mark}>{value.slice(index, index + term.length)}</mark>
      {value.slice(index + term.length)}
    </>
  );
}

/**
 * Buscador con sugerencias para elegir un registro existente: la lista de
 * coincidencias (por nombre, descripción o ID) se actualiza mientras se
 * escribe. Sigue el patrón ARIA *combobox* con lista emergente.
 * @param {{
 *   records: any[],
 *   singular: string,
 *   stockKey: string,
 *   onSelect: (id: string) => void,
 * }} props
 */
export function RecordPicker({ records, singular, stockKey, onSelect }) {
  const id = useId();
  const inputId = `${id}-input`;
  const listId = `${id}-list`;
  const hintId = `${id}-hint`;
  const listRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const term = fold(query.trim());
  const options = term
    ? records.filter((record) => fold(`${record.id} ${record.name} ${record.description ?? ""}`).includes(term))
    : records;
  const activeIndex = Math.min(active, Math.max(options.length - 1, 0));
  const expanded = open && records.length > 0;

  // Mantiene visible la opción activa al moverse con el teclado.
  useEffect(() => {
    if (!expanded) return;
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, expanded]);

  function choose(record) {
    onSelect(String(record.id));
    setQuery("");
    setOpen(false);
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + options.length) % Math.max(options.length, 1));
    } else if (event.key === "Enter") {
      // Enter elige la sugerencia activa en lugar de enviar el formulario.
      if (expanded && options[activeIndex]) {
        event.preventDefault();
        choose(options[activeIndex]);
      }
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  const optionId = (index) => `${id}-option-${index}`;

  return (
    <div className={styles.picker}>
      <label htmlFor={inputId} className={styles.label}>
        Buscar {singular}
        <span aria-hidden="true" className={styles.required}>
          {" "}
          *
        </span>
      </label>
      <div className={styles.inputWrap}>
        <Icon name="search" size={18} className={styles.searchIcon} />
        <input
          id={inputId}
          type="text"
          role="combobox"
          className={styles.input}
          value={query}
          placeholder="Escribe parte del nombre o el ID…"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && options[activeIndex] ? optionId(activeIndex) : undefined}
          aria-describedby={hintId}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
      <ul id={listId} ref={listRef} role="listbox" aria-label={`Resultados de ${singular}`} className={cx(styles.list, expanded && styles.open)}>
        {expanded && options.length === 0 ? (
          <li className={styles.empty} role="presentation">
            Ningún {singular} coincide con «{query.trim()}».
          </li>
        ) : null}
        {expanded
          ? options.map((record, index) => {
              const stock = Number(record[stockKey] ?? 0);
              return (
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- el teclado se maneja en el campo (aria-activedescendant)
                <li
                  key={record.id}
                  id={optionId(index)}
                  data-index={index}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={cx(styles.option, index === activeIndex && styles.active)}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(record)}
                >
                  <span className={styles.optionMain}>
                    <span className={styles.optionName}>
                      <Highlight text={record.name} term={term} />
                    </span>
                    {record.description ? (
                      <span className={styles.optionDescription}>
                        <Highlight text={record.description} term={term} />
                      </span>
                    ) : null}
                  </span>
                  <span className={styles.optionMeta}>
                    <span className={styles.optionId}>#{record.id}</span>
                    {stock <= 0 ? <Badge tone="neutral">Agotado</Badge> : <Badge tone="green">Stock {stock}</Badge>}
                  </span>
                </li>
              );
            })
          : null}
      </ul>
      </div>
      <p id={hintId} className={styles.hint} aria-live="polite">
        {term
          ? `${options.length} ${options.length === 1 ? "coincidencia" : "coincidencias"} de ${records.length}.`
          : `${records.length} ${records.length === 1 ? "registro" : "registros"}. Busca por nombre, descripción o ID.`}
      </p>
    </div>
  );
}
