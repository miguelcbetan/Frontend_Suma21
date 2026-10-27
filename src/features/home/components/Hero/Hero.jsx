import muralSrc from "@/assets/images/mural.jpeg";
import { Container } from "@/components/layout/Container";
import { Grid } from "@/components/layout/Grid";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Stat } from "@/components/ui/Stat";

import styles from "./Hero.module.css";

const STATS = [1, 2, 3].map((n) => ({ id: n, value: "[Cifra]", label: "[Descripción]" }));

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <Container className={styles.inner}>
        <div className={styles.content}>
          <Badge tone="green">Asociación de Interés Social Comunitario</Badge>
          <h1 id="hero-title" className={styles.title}>
            SUMA21 by ASISCO
          </h1>
          <p className={styles.lead}>[Descripción breve de la asociación y su propósito]</p>
          <div className={styles.actions}>
            <ButtonLink href="/apoyanos-tienda">Donar / Apoyar</ButtonLink>
            <ButtonLink href="#iniciativas" variant="secondary">
              Conoce nuestras iniciativas
            </ButtonLink>
          </div>
          <Grid columns={3} className={styles.stats}>
            {STATS.map(({ id, value, label }) => (
              <Stat key={id} value={value} label={label} />
            ))}
          </Grid>
        </div>
        <img
          src={muralSrc}
          alt="Mural ASISCO UP"
          width={2383}
          height={900}
          className={styles.media}
        />
      </Container>
    </section>
  );
}
