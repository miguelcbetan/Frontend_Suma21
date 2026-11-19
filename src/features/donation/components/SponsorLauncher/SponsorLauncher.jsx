import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

import { SponsorDialog } from "../SponsorDialog";

/**
 * Botón «Ser padrino» y el diálogo del Plan Padrino que abre.
 * @param {{
 *   session?: { authenticated: boolean, userId: string | null },
 *   label?: string,
 *   size?: "sm" | "md" | "lg",
 *   variant?: "primary" | "secondary" | "outline",
 *   withIcon?: boolean,
 *   className?: string,
 * }} props
 */
export function SponsorLauncher({
  session,
  label = "Ser padrino",
  size = "md",
  variant = "primary",
  withIcon = false,
  className,
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button aria-haspopup="dialog" size={size} variant={variant} className={className} onClick={() => setOpen(true)}>
        {withIcon ? <Icon name="users" size={20} /> : null}
        {label}
      </Button>
      <SponsorDialog open={open} onClose={() => setOpen(false)} session={session} />
    </>
  );
}
