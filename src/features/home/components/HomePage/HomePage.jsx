import { ActivitiesSection } from "../ActivitiesSection";
import { FamiliesSection } from "../FamiliesSection";
import { Hero } from "../Hero";
import { ParticipateSection } from "../ParticipateSection";
import { SupportSection } from "../SupportSection";

export function HomePage() {
  return (
    <>
      <Hero />
      <ActivitiesSection />
      <ParticipateSection />
      <FamiliesSection />
      <SupportSection />
    </>
  );
}
