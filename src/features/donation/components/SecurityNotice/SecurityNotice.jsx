import { Icon } from "@/components/ui/Icon";

import styles from "./SecurityNotice.module.css";

export function SecurityNotice() {
  return (
    <aside className={styles.notice}>
      <Icon name="shield" size={32} />
      <div>
        <p className={styles.title}>Pago seguro con Wompi</p>
        <p className={styles.text}>
          Los datos de tu medio de pago se ingresan directamente en la pasarela de Wompi. Solo confirmamos tu
          donación cuando el pago queda aprobado.
        </p>
      </div>
    </aside>
  );
}
