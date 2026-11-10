import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";

import styles from "./AboutSection.module.css";

/** Programas que ASISCO declara en sus documentos (certificado de donación y diálogo de donación). */
const PROGRAMS = [
  "Formación laboral",
  "Arte",
  "Barismo inclusivo",
  "Acompañamiento psicosocial",
  "Autonomía integral",
];

/**
 * Contexto institucional: qué es ASISCO y su relación con SUMA21.
 * PENDIENTE DE CONTENIDO: confirmar y ampliar con la historia y misión oficiales.
 */
export function AboutSection() {
  return (
    <section className={styles.about} aria-labelledby="about-title">
      <Container className={styles.inner}>
        <div className={styles.text}>
          <Badge tone="green">Quiénes somos</Badge>
          <h2 id="about-title" className={styles.title}>
            ASISCO y <span className={styles.highlight}>SUMA21</span>
          </h2>
          <p>
            La Asociación de Interés Social Comunitario ASISCO es una entidad sin ánimo de lucro de Manizales,
            Caldas, que acompaña a jóvenes con síndrome de Down y a sus familias en su camino hacia la autonomía.
          </p>
          <p>
            SUMA21 es su plataforma digital: reúne en un solo lugar las donaciones, la tienda solidaria y las
            donaciones en especie que sostienen sus programas.
          </p>
        </div>

        <aside className={styles.card} aria-label="Programas de ASISCO">
          <Logo size="md" className={styles.logo} />
          <p className={styles.motto}>¡No somos Down, somos UP!</p>
          <p className={styles.cardTitle}>Programas que apoyas</p>
          <ul className={styles.programs}>
            {PROGRAMS.map((program) => (
              <li key={program}>
                <span className={styles.check}>
                  <Icon name="check" size={14} />
                </span>
                {program}
              </li>
            ))}
          </ul>
        </aside>
      </Container>
    </section>
  );
}
