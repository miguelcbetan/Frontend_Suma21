import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

import { DonationDialog } from "../DonationDialog";

/**
 * Botón «Donar ahora» y el diálogo que abre. `session` indica si hay un
 * usuario con sesión iniciada. El aspecto del botón se puede ajustar para
 * reutilizarlo en distintas zonas de la página.
 * @param {{
 *   session?: { authenticated: boolean, userId: string | null, name?: string },
 *   label?: string,
 *   size?: "sm" | "md" | "lg",
 *   variant?: "primary" | "secondary" | "outline",
 *   withIcon?: boolean,
 *   className?: string,
 * }} props
 */
export function DonationLauncher({
  session,
  label = "Donar ahora",
  size = "md",
  variant = "primary",
  withIcon = false,
  className,
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        aria-haspopup="dialog"
        size={size}
        variant={variant}
        className={className}
        onClick={() => setOpen(true)}
      >
        {withIcon ? <Icon name="heart" size={20} /> : null}
        {label}
      </Button>
      <DonationDialog open={open} onClose={() => setOpen(false)} session={session} />
    </>
  );
}
