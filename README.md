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

Contratos, flujo de pago y pendientes del backend: **[docs/integracion-backend.md](docs/integracion-backend.md)**.

- **Configuración** (`src/core/api/config.js`): `VITE_API_URL` (origen del backend de datos, por defecto Render), `VITE_API_PREFIX` (por defecto `/api/v1`) y `VITE_AUTH_URL` (servicio de autenticación). Ver `.env.example`. No hay claves de Wompi en el frontend.
- **Cliente HTTP** (`src/core/api/httpClient.js`): bases `api` (`/api/v1`), `root` (`/health`) y `auth` (`/auth/*`). Envía el token `Bearer` a los dos servicios y convierte los errores (`{ error, code }`) en `ApiError`. Solo un 401 del servicio de auth cierra la sesión.
- **Servicios** (`src/core/api/services/`): `authService`, `productsService`, `inventoryService`, `salesService`, `donationsService`, `transactionsService`, `paymentsService` y `healthService`. Cada uno llama a un endpoint real de Swagger.
- **Roles** (`src/features/auth/session.js`): `ADMIN` usa el panel `/admin`. `DONANTE` (o `CUSTOMER`) es la experiencia de cliente. El registro público crea cuentas `DONANTE`.
- **Tienda y carrito** (`src/features/store/`): catálogo (exige sesión), carrito guardado en la cuenta (venta `DRAFT` de `/api/v1/sales/cart…`, ver `cart/CartProvider.jsx`) y compra con `POST /api/v1/sales/checkout`, que reserva el stock y devuelve el checkout de Wompi.
- **Donaciones** (`src/features/donation/`): «Donar ahora» usa `POST /api/v1/donations/monetary`. `/donaciones-en-especie` lista `GET /api/v1/inventory/needed` y registra con `POST /api/v1/donations/inkind`.
- **Pagos** (`src/features/payment/`, `src/core/utils/wompiWidget.js`): widget de Wompi con la firma que entrega el backend. `/payment-result` y `/mis-operaciones` consultan `GET /api/v1/payments/:reference`. Solo `APPROVED` cuenta como pago exitoso.
- **Panel de administración** (`src/features/admin/`): productos (crear o aumentar stock de uno existente, imagen validada), inventario (crear o ajustar stock, marcar «Solicitado»), ingresos paginados, ventas registradas y alta de usuarios.

## Pruebas locales

```bash
npm install
```

```bash
npm run dev
```

Abre exactamente `http://localhost:5173` (no `127.0.0.1`): es el único origen local que acepta el CORS del backend de datos. Sin `.env.local` se usa el backend de Render.

Qué funciona desde localhost:

- Navegación, diseño responsive y páginas públicas.
- Estado del servidor (`/health`) y lista pública de artículos solicitados (`/donaciones-en-especie`).

Qué **no** funciona desde localhost: iniciar sesión. El servicio de autenticación responde 403 al origen `http://localhost:5173`. Mientras su equipo no lo habilite, la tienda, el carrito, los pagos, las donaciones y el panel admin se prueban en el frontend desplegado.

Verificaciones antes de desplegar:

```bash
npm run lint
```

```bash
npm run build
```

```bash
npm run preview
```

## Despliegue (Render, sitio estático)

- Build command: `npm ci && npm run build`. Publish directory: `dist`.
- Variables de entorno (se leen al compilar): `VITE_API_URL`, `VITE_API_PREFIX` y `VITE_AUTH_URL` (opcionales: sus valores por defecto ya apuntan a Render).
- Regla de reescritura para el enrutado del SPA: `/*` → `/index.html` (Rewrite). Sin ella, `/payment-result` daría 404 al volver de Wompi.

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
