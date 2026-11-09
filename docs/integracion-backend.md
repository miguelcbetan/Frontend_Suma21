# Integración con el backend SUMA 21

Fuentes verificadas el 9 de noviembre de 2026: el código del backend (`backend-suma21`, commit `a6874ed`, solo lectura), Swagger en vivo (`https://suma21-backend.onrender.com/api-docs`), las colecciones Postman del backend y peticiones GET y OPTIONS al despliegue de Render.

## Configuración

| Variable | Valor por defecto | Uso |
|---|---|---|
| `VITE_API_URL` | `https://suma21-backend.onrender.com` | Origen del backend de datos. `/health` vive aquí. |
| `VITE_API_PREFIX` | `/api/v1` | Prefijo de todos los recursos REST. |
| `VITE_AUTH_URL` | `https://proyecto-integrador-backend-g2.onrender.com` | Servicio de autenticación (`/auth/*`). |

Todo se centraliza en `src/core/api/config.js`. El frontend no usa claves de Wompi: la llave pública y la firma de integridad llegan del backend en cada checkout. **Nunca** se deben poner en el frontend `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET` ni `WOMPI_INTEGRITY_SECRET`.

## Autenticación y roles

- Login, registro y perfil se hacen contra el servicio de auth. El token se guarda en `localStorage` y se envía como `Authorization: Bearer` **a ambos servicios**. El backend de datos lo valida contra `SECURITY_MS_URL`.
- El backend de datos solo distingue `ADMIN` (`requireRole(["ADMIN"])`). Cualquier otro usuario autenticado puede comprar y donar.
- En el frontend, `ADMIN` ve el panel `/admin`. `DONANTE` (o `CUSTOMER`, si el servicio de auth lo incorpora) es la experiencia de cliente: tienda, carrito, donaciones y «Mis operaciones». El registro público crea cuentas `DONANTE`.
- El comprador o donante **no se envía**: el backend lo toma del token (`req.user.id` y `req.user.email`).

## Endpoints consumidos

| Pantalla | Método y ruta | Notas |
|---|---|---|
| Panel admin (estado) | `GET /health` | Sin prefijo `/api/v1`. |
| Tienda / admin | `GET /products`, `GET /products/:id` | Exige token (cualquier rol). |
| Admin · Productos | `POST /products`, `PATCH /products/:id`, `DELETE /products/:id` | ADMIN. JSON o `multipart/form-data` con `image`. `stock_qty` ≥ 1. |
| Admin · Aumentar stock de producto | `GET /products/:id` y luego `PATCH /products/:id {stock_qty: actual + n}` | No hay ajuste atómico para productos (ver pendientes). |
| Donar en especie | `GET /inventory/needed` | Público. Campo real: `is_needed`. |
| Admin · Inventario | `GET/POST /inventory`, `PATCH/DELETE /inventory/:id` | ADMIN. Alta `{name, description?, stock ≥ 1, is_needed}`. Edición `{name?, description?, is_needed?}`. DELETE responde 409 si hay stock. |
| Admin · Ajustar stock de inventario | `PATCH /inventory/:id/stock {operation: increase\|decrease, quantity}` | Atómico. |
| Tienda · Pagar | `POST /sales {items: [{product_id, quantity}]}` → `{sale, checkout}` | **Compras = SALES.** |
| Donar ahora | `POST /donations/monetary {amount}` → `{donationId, checkout}` | **Donaciones = DONATION.** Máximo 2 decimales. |
| Donar en especie | `POST /donations/inkind {donation_date, notes?, items: [{inventory_item_id, quantity}]}` | Solo artículos existentes. |
| Resultado del pago / Mis operaciones | `GET /payments/:reference` | Estados: `PENDING`, `APPROVED`, `DECLINED`, `VOIDED`, `ERROR`. |
| Admin · Ingresos | `GET /transactions/sales`, `GET /transactions/donations` `?from&to&page&limit` | Paginado (`limit` ≤ 100). Solo aprobadas. |
| Admin · Ventas registradas | `GET /sales` | Todas las ventas con su estado. |
| Admin · Usuarios | `POST /auth/usuarios` | Servicio de auth, ADMIN. |

No se usa `POST /payments/checkout`: firma montos y referencias arbitrarias sin autenticación y no registra la venta ni la donación.

## Flujo de pago con Wompi (Sandbox)

1. El cliente confirma el carrito (`POST /sales`) o el monto (`POST /donations/monetary`).
2. El backend responde con `checkout = {reference, amountInCents, currency, customerEmail, publicKey, integritySignature, paymentUrl}`.
3. `src/core/utils/wompiWidget.js` carga `https://checkout.wompi.co/widget.js` y abre `WidgetCheckout` con esos datos y `redirectUrl = <origen>/payment-result`. Si el script no carga, redirige a `paymentUrl` con el parámetro `redirect-url`.
4. Al cerrar el widget, o al volver de un medio con redirección, se abre `/payment-result?reference=…`. La referencia también queda guardada en este navegador.
5. `/payment-result` consulta `GET /payments/:reference` cada 3 s mientras siga `PENDING` (máximo 2 minutos). **Solo** `APPROVED` se muestra como pago exitoso; volver de Wompi no basta.
6. Si una compra queda `APPROVED`, se vacía el carrito. Si queda `DECLINED`, `VOIDED` o `ERROR`, el carrito se conserva para reintentar (cada intento crea una venta nueva).

## Carrito

El backend **no tiene endpoint de carrito** (`/api/v1/cart` responde 404). El carrito (`src/features/store/cart/`) guarda `{product_id: cantidad}` por usuario en este navegador como apoyo temporal. La interfaz dice «se guarda en este navegador» y nunca lo presenta como guardado en la cuenta. Toda la persistencia está en `cartStorage.js`: cuando exista el endpoint, solo hay que cambiar ese archivo.

## Pendientes para el equipo backend / auth

| # | Problema | Qué se necesita |
|---|---|---|
| 1 | El servicio de auth responde **403 «Origen no autorizado»** a `http://localhost:5173` (también a `/health`). Sin eso no se puede iniciar sesión desde localhost. | Agregar `http://localhost:5173` a los orígenes permitidos del servicio de auth. |
| 2 | No existe carrito persistente. | `GET /api/v1/cart` → `{items: [{product_id, quantity}]}` y `PUT /api/v1/cart` con el mismo cuerpo, por usuario del token. Que valide existencia y stock. |
| 3 | `GET /products` exige token: los visitantes no pueden ver el catálogo. | Confirmar si el catálogo debe ser público (como `GET /inventory/needed`). |
| 4 | `GET /sales` no tiene autenticación y expone todas las ventas. `GET /transactions/*` exige token pero no rol: cualquier cliente ve los ingresos de todos. | Proteger con `requireRole(["ADMIN"])`. |
| 5 | `POST /payments/checkout` no tiene autenticación y devuelve firmas de integridad para cualquier referencia o monto. | Protegerlo o retirarlo (el frontend no lo usa). |
| 6 | No hay «mis operaciones» ni listado de donaciones en especie. | `GET /api/v1/me/sales`, `GET /api/v1/me/donations` (o filtros por usuario del token) y `GET /api/v1/donations/inkind` para ADMIN. «Mis operaciones» hoy muestra solo los pagos iniciados en el navegador. |
| 7 | Para productos no hay ajuste atómico de stock (para inventario sí). | `PATCH /api/v1/products/:id/stock {operation, quantity}`, como en inventario. Hoy se hace leer y luego escribir, con riesgo de carrera. |
| 8 | La venta descuenta stock al crearse y solo lo devuelve si Wompi informa `DECLINED`, `VOIDED` o `ERROR`. Un pago abandonado deja el stock retenido. | Expiración de ventas `PENDING` o una reserva con tiempo límite. |
| 9 | `POST /donations/inkind` suma el stock de inmediato, aunque el cliente solo registra su intención. | Confirmar si debe quedar pendiente hasta que la fundación reciba los artículos. |
| 10 | No hay endpoint para reintentar el pago de una venta o donación existente. | Opcional: `POST /api/v1/sales/:id/checkout` y `POST /api/v1/donations/:id/checkout`. |
| 11 | Swagger marca `/products` e `/inventory` sin seguridad, aunque exigen token. La colección Postman de regresión aún incluye `/accounts` y `/payment-methods`, que ya no existen. | Actualizar la documentación. |
| 12 | Si en el panel de Wompi Sandbox la URL de eventos no apunta al webhook, los pagos se quedan en `PENDING`. | Confirmar que la URL de eventos es `https://suma21-backend.onrender.com/api/v1/payments/webhook` (o `/wompi/events`). |
| 13 | `PAYMENT_RETURN_URL` solo lo usa el cliente de enlaces de pago, que no participa en el flujo actual. | Nada que hacer en el frontend: el retorno lo define el widget. |
| 14 | `POST /donations/*` convierte `req.user.id` en entero (`idParam`): un servicio de auth con IDs no numéricos rompería las donaciones. | Confirmar que los IDs del servicio de auth son numéricos (las ventas existentes muestran `customerId: "1"`). |

## CORS verificado

| Origen | Backend de datos | Servicio de auth |
|---|---|---|
| `http://localhost:5173` | ✅ permitido | ❌ 403 |
| `http://127.0.0.1:5173` | ❌ | ❌ |
| `http://localhost:4173` (`vite preview` por defecto) | ❌ | ❌ |
| `https://suma21-frontend.onrender.com` | ✅ | ✅ |

Por eso `vite.config.js` fija el puerto 5173 con `strictPort` también para `vite preview`.
