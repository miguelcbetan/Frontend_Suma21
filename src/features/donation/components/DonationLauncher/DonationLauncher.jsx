import { useState } from "react";

import { Button } from "@/components/ui/Button";

import { DonationDialog } from "../DonationDialog";

/**
 * Botón «Donar ahora» y el diálogo que abre. `session` indica si hay un
 * donante con sesión iniciada y a qué cliente corresponde.
 * @param {{ session?: { authenticated: boolean, donorId: string | null } }} props
 */
export function DonationLauncher({ session }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button aria-haspopup="dialog" onClick={() => setOpen(true)}>
        Donar ahora
      </Button>
      <DonationDialog open={open} onClose={() => setOpen(false)} session={session} />
    </>
  );
}
