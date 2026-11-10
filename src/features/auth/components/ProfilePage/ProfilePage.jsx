import { Link } from "react-router-dom";

import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

import { useAuth } from "../../context/useAuth.js";
import { isAdmin } from "../../session.js";

import styles from "./ProfilePage.module.css";

const ROLE_LABELS = {
  ADMIN: "Administración",
  DONANTE: "Donante",
  CUSTOMER: "Cliente",
  ESTUDIANTE: "Estudiante",
  ACUDIENTE: "Acudiente",
  TALLERISTA: "Tallerista",
};

/** Página `/perfil`: datos de la cuenta que devuelve `GET /auth/perfil`. */
export function ProfilePage() {
  const { user, logout } = useAuth();
  const admin = isAdmin(user);
  const initial = (user.username ?? "?").trim().charAt(0).toUpperCase() || "?";

  const shortcuts = admin
    ? [{ to: "/admin", icon: "chart", title: "Panel de administración", text: "Productos, inventario y ventas registradas." }]
    : [
        { to: "/mis-operaciones", icon: "receipt", title: "Mis operaciones", text: "Estado de tus compras y donaciones." },
        { to: "/apoyanos-tienda", icon: "bag", title: "Tienda", text: "Productos disponibles y tu carrito." },
        { to: "/donaciones-en-especie", icon: "package", title: "Donar en especie", text: "Artículos que solicita la fundación." },
      ];

  return (
    <Container className={styles.page}>
      <section className={styles.card} aria-labelledby="profile-title">
        <header className={styles.header}>
          <span className={styles.avatar} aria-hidden="true">
            {initial}
          </span>
          <div className={styles.identity}>
            <h1 id="profile-title" className={styles.title}>
              {user.username}
            </h1>
            <p className={styles.email}>{user.email || "Sin correo registrado"}</p>
            <div className={styles.roles} aria-label="Roles">
              {user.roles.map((role) => (
                <Badge key={role} tone={role === "ADMIN" ? "orange" : "green"}>
                  {ROLE_LABELS[role] ?? role}
                </Badge>
              ))}
            </div>
          </div>
        </header>

        <div className={styles.body}>
          <h2 className={styles.sectionTitle}>Accesos rápidos</h2>
          <ul className={styles.shortcuts}>
            {shortcuts.map(({ to, icon, title, text }) => (
              <li key={to}>
                <Link to={to} className={styles.shortcut}>
                  <span className={styles.shortcutIcon}>
                    <Icon name={icon} size={20} />
                  </span>
                  <span>
                    <span className={styles.shortcutTitle}>{title}</span>
                    <span className={styles.shortcutText}>{text}</span>
                  </span>
                  <Icon name="arrowRight" size={18} className={styles.chevron} />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <footer className={styles.footer}>
          <Button variant="outline" onClick={logout}>
            <Icon name="logout" size={18} />
            Cerrar sesión
          </Button>
        </footer>
      </section>
    </Container>
  );
}
