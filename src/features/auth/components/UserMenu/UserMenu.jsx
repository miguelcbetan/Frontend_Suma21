import { Link } from "react-router-dom";

import { buttonClassName } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

import { useAuth } from "../../context/useAuth.js";

import styles from "./UserMenu.module.css";

/** Acceso a la sesión en la cabecera: «Iniciar sesión» o usuario + «Cerrar sesión». */
export function UserMenu() {
  const { status, user, logout } = useAuth();

  if (status === "authenticated") {
    const initial = (user.username ?? "?").trim().charAt(0).toUpperCase() || "?";
    return (
      <div className={styles.menu}>
        <Link to="/perfil" className={styles.profile} title="Ver mi perfil">
          <span className={styles.avatar} aria-hidden="true">
            {initial}
          </span>
          <span className={styles.name}>
            <span className="sr-only">Mi perfil: </span>
            {user.username}
          </span>
        </Link>
        <button type="button" className={styles.logout} onClick={logout} title="Cerrar sesión">
          <Icon name="logout" size={18} />
          <span className={styles.logoutLabel}>Cerrar sesión</span>
        </button>
      </div>
    );
  }

  return (
    <Link to="/login" className={buttonClassName({ variant: "outline", size: "sm" })}>
      <Icon name="user" size={18} />
      Iniciar sesión
    </Link>
  );
}
