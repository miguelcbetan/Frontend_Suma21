import { Link } from "react-router-dom";

import { Container } from "@/components/layout/Container";
import { buttonClassName } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

import { InKindDonationPanel } from "../InKindDonationPanel";

import styles from "./InKindDonationPage.module.css";

/**
 * Página dedicada para registrar donaciones en especie (`ADMIN`), promovida al
 * menú superior para quedar accesible sin navegar dentro del panel lateral.
 */
export function AdminInKindDonationPage() {
  return (
    <Container className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>Administración · Donaciones</p>
          <h1 className={styles.title}>Registrar donación en especie</h1>
          <p className={styles.subtitle}>
            Completa las 3 etapas para registrar al donante, sumar los artículos al inventario y emitir el certificado.
          </p>
        </div>
        <div className={styles.actions}>
          <Link to="/admin" className={buttonClassName({ variant: "outline", size: "sm" })}>
            <Icon name="arrowLeft" size={16} />
            Ir al panel admin
          </Link>
          <Link to="/admin?seccion=donations-history" className={buttonClassName({ variant: "ghost", size: "sm" })}>
            <Icon name="heart" size={16} />
            Historial de donaciones
          </Link>
        </div>
      </header>

      <div className={styles.wizard}>
        <InKindDonationPanel />
      </div>
    </Container>
  );
}
