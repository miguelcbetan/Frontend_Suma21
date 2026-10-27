import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { describeError } from "@/core/api";

import { useAuth } from "../../context/useAuth.js";
import styles from "../forms.module.css";

/**
 * Formulario de inicio de sesión (`POST /auth/login`).
 * @param {{ onSuccess: (user: import("../../context/authContext.js").AuthUser) => void }} props
 */
export function LoginForm({ onSuccess }) {
  const { login } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState({ message: "", fields: {} });

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError({ message: "", fields: {} });
    try {
      const user = await login({ email: form.get("email").trim(), clave: form.get("clave") });
      onSuccess(user);
    } catch (caught) {
      setError(describeError(caught));
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={styles.form}>
      {error.message ? <Alert tone="error">{error.message}</Alert> : null}
      <Field
        label="Correo electrónico"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={error.fields.email}
      />
      <Field
        label="Contraseña"
        name="clave"
        type="password"
        autoComplete="current-password"
        required
        error={error.fields.clave}
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Ingresando…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
