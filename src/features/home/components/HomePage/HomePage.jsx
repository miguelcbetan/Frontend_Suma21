import { AboutSection } from "../AboutSection";
import { ClosingCta } from "../ClosingCta";
import { Hero } from "../Hero";
import { HowItWorksSection } from "../HowItWorksSection";
import { WaysToHelpSection } from "../WaysToHelpSection";

/*
 * PENDIENTE DE CONTENIDO: `ActivitiesSection`, `ParticipateSection`,
 * `FamiliesSection`, `SupportSection` e `InitiativesSection` no se muestran
 * hasta contar con información real (agenda, voluntariado, contacto para
 * familias, iniciativas). Para reactivarlas, impórtalas y agrégalas aquí.
 */

/**
 * Portada. El botón de donar llega desde la capa app (`renderDonateButton`)
 * porque abre el diálogo de la feature de donaciones.
 * @param {{
 *   renderDonateButton?: (options: { size?: "md" | "lg", variant?: "primary" | "outline", withIcon?: boolean }) => import("react").ReactNode,
 *   authenticated?: boolean,
 * }} props
 */
export function HomePage({ renderDonateButton = () => null, authenticated = false }) {
  return (
    <>
      <Hero donateButton={renderDonateButton({ size: "lg", withIcon: true })} />
      <WaysToHelpSection donateButton={renderDonateButton({ size: "md" })} />
      <HowItWorksSection />
      <AboutSection />
      <ClosingCta donateButton={renderDonateButton({ size: "lg", withIcon: true })} authenticated={authenticated} />
    </>
  );
}
