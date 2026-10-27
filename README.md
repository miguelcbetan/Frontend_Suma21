# SUMA21 by ASISCO · Frontend

Aplicación web de la asociación SUMA21 by ASISCO, construida con React y Vite.

## Tecnologías

- [React](https://react.dev) 19
- [Vite](https://vite.dev) 8
- CSS Modules y design tokens (variables CSS)
- ESLint 9

## Requisitos

- Node.js 20.19 o superior
- npm

## Instalación y ejecución

```bash
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

| Script            | Descripción                                          |
| ----------------- | ---------------------------------------------------- |
| `npm run dev`     | Servidor de desarrollo con recarga en caliente       |
| `npm run build`   | Genera la versión de producción en `dist/`           |
| `npm run preview` | Sirve localmente el build de producción              |
| `npm run lint`    | Analiza el código, incluidas las reglas de capas     |

## Conexión con el backend

La URL del backend se configura con `VITE_API_URL` (ver `.env.example`); por defecto apunta al despliegue en Render. Para usar un backend local: `VITE_API_URL=http://127.0.0.1:3000`.

- **Cliente HTTP y servicios**: `src/core/api/`. `httpClient.js` adjunta el token `Bearer` y convierte los errores del backend (`{ error, detalles }`) en `ApiError`. `services/` tiene un servicio por grupo de endpoints: `/auth/*` (`authService`) y los de `API.md` (productos, clientes, métodos de pago, cuentas, inventario, ventas, donaciones y `/health`).
- **Login y sesión**: `src/features/auth/`. Rutas `/login` (inicio de sesión y registro de donantes) y guard `RequireRole`. El portal solo admite los roles `ADMIN` y `DONANTE`; el token se guarda en `localStorage` y se valida con `GET /auth/perfil` al abrir la app.
- **Panel de administración**: `src/features/admin/`, ruta `/admin` (solo `ADMIN`). Una pestaña por grupo de endpoints de `API.md`, generada desde `resources.js`.
- **Donaciones**: el diálogo «Donar ahora» envía `POST /api/donations/monetary` cuando hay sesión de donante.

## Arquitectura

El código se organiza por responsabilidades. Cada capa solo puede depender de las que tiene por debajo.

```
index.html              Punto de entrada de Vite
vite.config.js          Configuración de Vite y alias @ → src
src/
├── main.jsx            Monta la aplicación en #root e importa los estilos globales
├── App.jsx             Composición de la página (capa app)
├── components/
│   ├── ui/             Componentes visuales genéricos y reutilizables
│   └── layout/         Estructura de página: cabecera, pie, secciones, rejillas
├── features/           Módulos funcionales independientes
├── core/               Utilidades puras compartidas por varias capas
├── styles/             Tokens de diseño, reset y estilos base
└── assets/             Imágenes y recursos importados desde el código
```

### Capas y dependencias

| Capa                   | Responsabilidad                                                      | Puede importar de                |
| ---------------------- | -------------------------------------------------------------------- | -------------------------------- |
| `main.jsx`, `App.jsx`  | Arranque y composición de la página                                  | `features`, `components`, `core` |
| `features/<módulo>`    | Componentes y lógica propios de un módulo funcional                  | `components`, `core`             |
| `components/layout`    | Estructura de página, sin conocimiento del dominio                   | `components/ui`, `core`          |
| `components/ui`        | Componentes visuales genéricos                                       | `core`                           |
| `core`                 | Utilidades puras y cliente de API (`core/api`)                       | nada                             |

Estas reglas se verifican automáticamente con ESLint (`import/no-restricted-paths` e `import/no-cycle`): un `core` que importe de `components`, un `components` que importe de `features` o una feature que importe de otra hacen fallar `npm run lint`.

### Composición

Los componentes de `components/` no conocen módulos concretos: reciben su contenido por props y *slots*. La capa `App.jsx` es la que une las piezas. Por ejemplo, `SiteHeader` expone los slots `brand`, `leading` y `actions`, y `App.jsx` decide qué se coloca en cada uno.

### Módulos (`features/`)

Cada módulo es una carpeta autocontenida con una API pública en su `index.js`; el resto de capas solo importan desde ahí.

```
features/<módulo>/
├── components/     Componentes propios del módulo
└── index.js        API pública
```

Un componente nace dentro del módulo que lo usa y se mueve a `components/` cuando otro módulo lo necesita. Dos módulos nunca se importan entre sí.

### Componentes

Cada componente vive en su propia carpeta:

```
Nombre/
├── Nombre.jsx          Componente; sus props se documentan con JSDoc
├── Nombre.module.css   Estilos locales
└── index.js            Exportación pública
```

Los estilos usan únicamente los tokens definidos en `src/styles/tokens.css` (colores, tipografía, espaciado, radios y sombras). Los componentes se importan siempre por su carpeta, con el alias `@`:

```js
import { Button } from "@/components/ui/Button";
```

## Convenciones

- Componentes funcionales en `PascalCase` (`.jsx`); utilidades en `camelCase` (`.js`).
- HTML semántico y accesible; las reglas de `jsx-a11y` están activas en el lint.
- Diseño *mobile-first*: estilos base para móvil y `min-width` para pantallas mayores.
- Antes de integrar cambios, ejecutar `npm run lint` y `npm run build`.
