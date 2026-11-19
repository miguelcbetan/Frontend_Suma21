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
 * Portada. Los botones de donar y del Plan Padrino llegan desde la capa app
 * (`renderDonateButton`, `renderSponsorButton`) porque abren diálogos de la
 * feature de donaciones.
 * @typedef {{ size?: "md" | "lg", variant?: "primary" | "secondary" | "outline", withIcon?: boolean }} LauncherOptions
 * @param {{
 *   renderDonateButton?: (options: LauncherOptions) => import("react").ReactNode,
 *   renderSponsorButton?: (options: LauncherOptions) => import("react").ReactNode,
 *   authenticated?: boolean,
 * }} props
 */
export function HomePage({ renderDonateButton = () => null, renderSponsorButton = () => null, authenticated = false }) {
  return (
    <>
      <Hero
        donateButton={renderDonateButton({ size: "lg", withIcon: true })}
        sponsorButton={renderSponsorButton({ size: "lg", withIcon: true, variant: "primary" })}
      />
      <WaysToHelpSection
        donateButton={renderDonateButton({ size: "md" })}
        sponsorButton={renderSponsorButton({ size: "md", label: "Ser padrino" })}
      />
      <HowItWorksSection />
      <AboutSection />
      <ClosingCta donateButton={renderDonateButton({ size: "lg", withIcon: true })} authenticated={authenticated} />
    </>
  );
}
