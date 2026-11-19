import muralSrc from "@/assets/images/mural.jpeg";
import { Container } from "@/components/layout/Container";

import styles from "./CampaignPage.module.css";

const CONTENT = {
  down: {
    eyebrow: "Campaña oficial Semana del Síndrome de Down",
    title: "Cada aporte transforma vidas: construyamos inclusión hoy",
    lead: "Tu donación impulsa la autonomía, formación artística y empleo digno de jóvenes con síndrome de Down en Colombia.",
    label: "Semana Down",
  },
  cafe: {
    eyebrow: "Iniciativa Café SUMA21",
    title: "Talento, autonomía y oportunidades en cada taza",
    lead: "Apoyamos procesos de formación en barismo y empleo inclusivo para que cada persona pueda desarrollar su proyecto de vida.",
    label: "Iniciativa Café",
  },
};

export function CampaignPage({ kind = "down", donationAction }) {
  const content = CONTENT[kind] ?? CONTENT.down;

  return (
    <>
      <div className={styles.page}>
        <section className={styles.hero} style={{ backgroundImage: `linear-gradient(rgb(11 22 28 / .78), rgb(11 22 28 / .7)), url(${muralSrc})` }}>
          <Container className={styles.heroInner}>
            <p className={styles.eyebrow}>{content.eyebrow}</p>
            <h1>{content.title}</h1>
            <p className={styles.lead}>{content.lead}</p>
            <div className={styles.actions}>
              {donationAction ?? <a href="/donaciones" className={styles.primaryAction}>Donar ahora</a>}
              <a href="#impacto" className={styles.secondaryAction}>Conoce el impacto</a>
            </div>
          </Container>
        </section>
        <section id="impacto" className={styles.impact}>
          <Container>
            <p className={styles.sectionEyebrow}>{content.label}</p>
            <h2>Tu aporte se convierte en oportunidades reales</h2>
            <div className={styles.cards}>
              <article><strong>01</strong><h3>Formación</h3><p>Talleres prácticos y acompañamiento para fortalecer habilidades.</p></article>
              <article><strong>02</strong><h3>Autonomía</h3><p>Herramientas para tomar decisiones y construir un proyecto de vida.</p></article>
              <article><strong>03</strong><h3>Inclusión</h3><p>Espacios de trabajo, arte y comunidad donde cada talento cuenta.</p></article>
            </div>
          </Container>
        </section>
      </div>
    </>
  );
}
