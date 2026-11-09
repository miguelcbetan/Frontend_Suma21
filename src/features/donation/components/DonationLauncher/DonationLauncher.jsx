import { useState } from "react";

import { Button } from "@/components/ui/Button";

import { DonationDialog } from "../DonationDialog";

/**
 * Botón «Donar ahora» y el diálogo que abre. `session` indica si hay un
 * usuario con sesión iniciada.
 * @param {{ session?: { authenticated: boolean, userId: string | null, name?: string } }} props
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
