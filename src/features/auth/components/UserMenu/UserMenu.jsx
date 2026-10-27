import { Link } from "react-router-dom";

import { Button, buttonClassName } from "@/components/ui/Button";

import { useAuth } from "../../context/useAuth.js";

import styles from "./UserMenu.module.css";

/** Acceso a la sesión en la cabecera: «Iniciar sesión» o usuario + «Cerrar sesión». */
export function UserMenu() {
  const { status, user, logout } = useAuth();

  if (status === "authenticated") {
    return (
      <div className={styles.menu}>
        <span className={styles.name}>
          Hola, <strong>{user.username}</strong>
        </span>
        <Button variant="ghost" size="sm" onClick={logout}>
          Cerrar sesión
        </Button>
      </div>
    );
  }

  return (
    <Link to="/login" className={buttonClassName({ variant: "secondary", size: "sm" })}>
      Iniciar sesión
    </Link>
  );
}
