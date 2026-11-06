import { Link } from "react-router-dom";

import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClassName } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

import { useAuth } from "../../context/useAuth.js";
import { hasRole } from "../../session.js";

import styles from "./ProfilePage.module.css";

/** Página `/perfil`: datos de la cuenta que devuelve `GET /auth/perfil`. */
export function ProfilePage() {
  const { user, logout } = useAuth();

  return (
    <Container className={styles.page}>
      <Card className={styles.card}>
        <CardHeader>
          <h1 className={styles.title}>Mi perfil</h1>
        </CardHeader>
        <CardBody className={styles.body}>
          <dl className={styles.list}>
            <div>
              <dt>Usuario</dt>
              <dd>{user.username}</dd>
            </div>
            <div>
              <dt>Correo electrónico</dt>
              <dd>{user.email || "—"}</dd>
            </div>
            <div>
              <dt>Roles</dt>
              <dd className={styles.roles}>
                {user.roles.map((role) => (
                  <Badge key={role} tone="green">
                    {role}
                  </Badge>
                ))}
              </dd>
            </div>
          </dl>
          <div className={styles.actions}>
            {hasRole(user, "ADMIN") ? (
              <Link to="/admin" className={buttonClassName({ variant: "secondary" })}>
                Ir al panel de administración
              </Link>
            ) : null}
            <Button variant="ghost" onClick={logout}>
              Cerrar sesión
            </Button>
          </div>
        </CardBody>
      </Card>
    </Container>
  );
}
