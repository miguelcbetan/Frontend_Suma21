import muralSrc from "@/assets/images/mural.jpeg";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";

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
            ASISCO: <span className={styles.motto}>¡No somos Down, somos UP!</span>
          </h2>
          <p>
            La Asociación de Interés Social Comunitario ASISCO es una entidad sin ánimo de lucro de Manizales,
            Caldas, que acompaña a jóvenes con síndrome de Down y a sus familias en su camino hacia la autonomía.
          </p>
          <p>
            SUMA21 es su plataforma digital: reúne en un solo lugar las donaciones, la tienda solidaria y las
            donaciones en especie que sostienen sus programas.
          </p>
          <ul className={styles.programs} aria-label="Programas de ASISCO">
            {PROGRAMS.map((program) => (
              <li key={program}>{program}</li>
            ))}
          </ul>
        </div>
        <figure className={styles.media}>
          <img src={muralSrc} alt="" width={2383} height={900} loading="lazy" />
        </figure>
      </Container>
    </section>
  );
}
