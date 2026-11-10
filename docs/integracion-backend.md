# Integración con el backend SUMA 21

Fuentes verificadas el 9 de noviembre de 2026: el código del backend (`backend-suma21`, commit `b1fd2cb`, solo lectura; el carrito persistente llegó en `ce2824a`), Swagger en vivo (`https://suma21-backend.onrender.com/api-docs`), las colecciones Postman del backend y peticiones GET y OPTIONS al despliegue de Render.

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
| Tienda / admin | `GET /products`, `GET /products/:id` | La tienda los consulta sin token; el backend debe permitir acceso público para mostrar el catálogo a visitantes. |
| Admin · Productos | `POST /products`, `PATCH /products/:id`, `DELETE /products/:id` | ADMIN. JSON o `multipart/form-data` con `image`. `stock_qty` ≥ 1. |
| Admin · Aumentar stock de producto | `GET /products/:id` y luego `PATCH /products/:id {stock_qty: actual + n}` | No hay ajuste atómico para productos (ver pendientes). |
| Donar en especie | `GET /inventory/needed` | Público. Campo real: `is_needed`. |
| Admin · Inventario | `GET/POST /inventory`, `PATCH/DELETE /inventory/:id` | ADMIN. Alta `{name, description?, stock ≥ 1, is_needed}`. Edición `{name?, description?, is_needed?}`. DELETE responde 409 si hay stock. |
| Admin · Ajustar stock de inventario | `PATCH /inventory/:id/stock {operation: increase\|decrease, quantity}` | Atómico. |
| Tienda · Carrito | `GET /sales/cart` → venta `DRAFT` o `null` | El carrito es la venta `DRAFT` del usuario del token. No toca el stock. |
| Tienda · Agregar / cambiar cantidad | `POST /sales/cart/items {productId: "7", quantity: 2}` → carrito | Cantidad **absoluta** (reemplaza). `productId` como string. No valida ni reserva stock. |
| Tienda · Quitar producto | `DELETE /sales/cart/items/:productId` → carrito o `null` | 404 si el producto no estaba en el carrito. |
| Tienda · Pagar | `POST /sales/checkout` (sin cuerpo) → `{sale, checkout}` | **Compras = SALES.** Reserva stock y pasa la venta a `PENDING`. Si falla, repone el stock y vuelve a `DRAFT`. `POST /sales` ya no existe. |
| Donar ahora | `POST /donations/monetary {amount}` → `{donationId, checkout}` | **Donaciones = DONATION.** Máximo 2 decimales. |
| Donar en especie | `POST /donations/inkind {donation_date, notes?, items: [{inventory_item_id, quantity}]}` | Solo artículos existentes. |
| Resultado del pago / Mis operaciones | `GET /payments/:reference` | Estados: `PENDING`, `APPROVED`, `DECLINED`, `VOIDED`, `ERROR`. |
| Admin · Ingresos | `GET /transactions/sales`, `GET /transactions/donations` `?from&to&page&limit` | Paginado (`limit` ≤ 100). Solo aprobadas. |
| Admin · Ventas registradas | `GET /sales` | Todas las ventas con su estado (`DRAFT`, `PENDING`, `APPROVED`, `DECLINED`). |
| Admin · Usuarios | `POST /auth/usuarios` | Servicio de auth, ADMIN. |

No se usa `POST /payments/checkout`: firma montos y referencias arbitrarias sin autenticación y no registra la venta ni la donación.

## Flujo de pago con Wompi (Sandbox)

1. El cliente paga su carrito (`POST /sales/checkout`) o confirma el monto (`POST /donations/monetary`).
2. El backend responde con `checkout = {reference, amountInCents, currency, customerEmail, publicKey, integritySignature, paymentUrl}`.
3. `src/core/utils/wompiWidget.js` carga `https://checkout.wompi.co/widget.js` y abre `WidgetCheckout` con esos datos y `redirectUrl = <origen>/payment-result`. Si el script no carga, redirige a `paymentUrl` con el parámetro `redirect-url`.
4. Al cerrar el widget, o al volver de un medio con redirección, se abre `/payment-result?reference=…`. La referencia también queda guardada en este navegador.
5. `/payment-result` consulta `GET /payments/:reference` cada 3 s mientras siga `PENDING` (máximo 2 minutos). **Solo** `APPROVED` se muestra como pago exitoso; volver de Wompi no basta.
6. Después del checkout, el carrito del servidor queda vacío: la venta pasó de `DRAFT` a `PENDING`. Con `APPROVED`, el webhook marca la venta como aprobada. Con `DECLINED`, `VOIDED` o `ERROR`, la venta queda `DECLINED` y el stock se repone, pero **los productos no vuelven al carrito**: `/payment-result` ofrece «Volver a agregar estos productos al carrito», que los agrega de nuevo con `POST /sales/cart/items`.

## Carrito

Con sesión iniciada, el carrito se guarda en la base de datos como la venta `DRAFT` del usuario. `src/features/store/cart/CartProvider.jsx` lo carga al iniciar sesión y sincroniza cada cambio, por lo que sobrevive a recargas, cierres de sesión y cambios de dispositivo. Sin sesión, se conserva en `localStorage` (`suma21.cart.v1`); al iniciar sesión, sus cantidades se incorporan al carrito de la cuenta y se elimina la copia local.

- Cada cambio autenticado se muestra al instante y se envía en una **cola serializada**: cada llamada fija la cantidad absoluta, así que el orden importa. Si falla, se muestra el error y se puede reintentar la carga del carrito.
- Al combinar el carrito local al iniciar sesión, para un producto presente en ambos se conserva la cantidad mayor, evitando duplicar productos si la migración debe reintentarse.
- El total se estima con los precios del catálogo; el servidor valida los precios y el stock al pagar.
- Un producto eliminado del catálogo que siga en el carrito aparece como «no disponible» y bloquea el pago hasta quitarlo. El stock se valida al pagar.

## Pendientes para el equipo backend / auth

| # | Problema | Qué se necesita |
|---|---|---|
| 1 | El servicio de auth responde **403 «Origen no autorizado»** a `http://localhost:5173` (también a `/health`). Sin eso no se puede iniciar sesión desde localhost. | Agregar `http://localhost:5173` a los orígenes permitidos del servicio de auth. |
| 2 | ✅ **Resuelto** con `/sales/cart` y `/sales/checkout` (`ce2824a`). Queda una observación: agregar al carrito no valida stock; el stock se valida recién al pagar. | Opcional: validar stock al agregar para avisar antes. |
| 3 | `GET /products` exige token: los visitantes no pueden ver el catálogo. | Confirmar si el catálogo debe ser público (como `GET /inventory/needed`). |
| 4 | `GET /sales` no tiene autenticación y expone todas las ventas, ahora **incluidos los carritos `DRAFT` de todos los usuarios**. `GET /transactions/*` exige token pero no rol: cualquier cliente ve los ingresos de todos. | Proteger con `requireRole(["ADMIN"])`. |
| 5 | `POST /payments/checkout` no tiene autenticación y devuelve firmas de integridad para cualquier referencia o monto. | Protegerlo o retirarlo (el frontend no lo usa). |
| 6 | No hay «mis operaciones» ni listado de donaciones en especie. | `GET /api/v1/me/sales`, `GET /api/v1/me/donations` (o filtros por usuario del token) y `GET /api/v1/donations/inkind` para ADMIN. «Mis operaciones» hoy muestra solo los pagos iniciados en el navegador. |
| 7 | Para productos no hay ajuste atómico de stock (para inventario sí). | `PATCH /api/v1/products/:id/stock {operation, quantity}`, como en inventario. Hoy se hace leer y luego escribir, con riesgo de carrera. |
| 8 | Mejoró: el stock ya no se toca al armar el carrito, solo se reserva en `POST /sales/checkout`. Pero un pago abandonado deja la venta en `PENDING` con el stock retenido (el 9 de noviembre de 2026 había 10 ventas `PENDING`). | Expiración de ventas `PENDING` o una reserva con tiempo límite. |
| 9 | `POST /donations/inkind` suma el stock de inmediato, aunque el cliente solo registra su intención. | Confirmar si debe quedar pendiente hasta que la fundación reciba los artículos. |
| 10 | No hay endpoint para reintentar el pago de una venta o donación existente. Un rechazo deja la venta en `DECLINED` y no devuelve los productos al carrito; el frontend lo resuelve volviendo a agregarlos. | Opcional: `POST /api/v1/sales/:id/checkout`, o que un rechazo devuelva los ítems al `DRAFT`. |
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
