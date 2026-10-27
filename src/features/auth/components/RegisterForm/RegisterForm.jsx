import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { describeError } from "@/core/api";

import { useAuth } from "../../context/useAuth.js";
import styles from "../forms.module.css";

const MIN_USERNAME = 3;
const MIN_PASSWORD = 12;

/**
 * Registro público de donantes (`POST /auth/registro`) y acceso inmediato.
 * @param {{ onSuccess: (user: import("../../context/authContext.js").AuthUser) => void }} props
 */
export function RegisterForm({ onSuccess }) {
  const { register } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState({ message: "", fields: {} });

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = {
      username: form.get("username").trim(),
      email: form.get("email").trim(),
      clave: form.get("clave"),
    };

    const fields = {};
    if (data.username.length < MIN_USERNAME) fields.username = `Mínimo ${MIN_USERNAME} caracteres.`;
    if (!data.email) fields.email = "El correo es obligatorio.";
    if (data.clave.length < MIN_PASSWORD) fields.clave = `Mínimo ${MIN_PASSWORD} caracteres.`;
    if (Object.keys(fields).length > 0) {
      setError({ message: "Revisa los datos del formulario.", fields });
      return;
    }

    setPending(true);
    setError({ message: "", fields: {} });
    try {
      onSuccess(await register(data));
    } catch (caught) {
      setError(describeError(caught));
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={styles.form}>
      {error.message ? <Alert tone="error">{error.message}</Alert> : null}
      <Field
        label="Nombre de usuario"
        name="username"
        autoComplete="username"
        required
        error={error.fields.username}
      />
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
        autoComplete="new-password"
        required
        hint={`Mínimo ${MIN_PASSWORD} caracteres.`}
        error={error.fields.clave}
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Creando cuenta…" : "Crear cuenta de donante"}
      </Button>
    </form>
  );
}
