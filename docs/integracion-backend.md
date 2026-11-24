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

- El login usa el **puente del backend de datos** (`POST /api/v1/auth/login`), que autentica contra el servicio de auth y devuelve el mismo token más `requiresDocumentCompletion`. Perfil, registro y logout siguen contra el servicio de auth.
- Si `requiresDocumentCompletion` es `true` (y el usuario no es ADMIN), `DocumentCompletionDialog` bloquea el portal hasta enviar `POST /api/v1/auth/complete-document {full_name, document_type, document_number}`. La sesión y el token se conservan; el indicador se recuerda en `localStorage` (`suma21.requiresDocument`) porque `/auth/perfil` no lo informa. Un 409 `DONOR_PROFILE_ALREADY_LINKED` se trata como verificación completa.
- El token se guarda en `localStorage` y se envía como `Authorization: Bearer` **a ambos servicios**. El backend de datos lo valida contra `SECURITY_MS_URL`.
- El backend de datos solo distingue `ADMIN` (`requireRole(["ADMIN"])`). Cualquier otro usuario autenticado puede comprar y donar.
- En el frontend, `ADMIN` ve el panel `/admin`. `DONANTE` (o `CUSTOMER`, si el servicio de auth lo incorpora) es la experiencia de cliente: tienda, carrito, donaciones, «Mis compras» (`/mis-compras`, solo compras de la tienda) y «Mis donaciones» (`/mis-donaciones`, pestañas Monetarias, En especie y Plan Padrino). `/mis-operaciones` y `/mis-planes` redirigen a esas páginas. Las cuentas las crea el equipo responsable del servicio de auth.
- El comprador o donante **no se envía**: el backend lo toma del token (`req.user.id` y `req.user.email`).

## Endpoints consumidos

| Pantalla | Método y ruta | Notas |
|---|---|---|
| Iniciar sesión | `POST /auth/login {email, clave}` → `{token, expiraEn, usuario, requiresDocumentCompletion}` | Puente del backend de datos. |
| Verificación de documento | `POST /auth/complete-document {full_name, document_type, document_number}` | Una sola vez. 409 `DONOR_DOCUMENT_CONFLICT` si el documento ya está registrado. |
| Panel admin (estado) | `GET /health` | Sin prefijo `/api/v1`. |
| Tienda | `GET /products`, `GET /products/:id` | Público (`GET /products` devuelve solo productos con `stock_qty > 0`). |
| Admin · Listar productos | `GET /products/all` | Público (sin rol `ADMIN`), devuelve todos los productos activos incluyendo `stock_qty = 0`. |
| Admin · Productos | `POST /products`, `PATCH /products/:id`, `DELETE /products/:id` | ADMIN. JSON o `multipart/form-data` con `image`. `stock_qty` ≥ 1 al crear y ≥ 0 al actualizar. |
| Admin · Ajustar stock de producto | `GET /products/:id` y luego `PATCH /products/:id {stock_qty: siguiente}` | Permite aumentar o disminuir hasta `0` (`stock_qty` ≥ 0); ver pendientes sobre ajuste atómico. |
| Donar en especie (catálogo público) | `GET /inventory/needed` | Público. Campo real: `is_needed`; la página permite coordinar la entrega, no registra donaciones. |
| Admin · Inventario | `GET/POST /inventory`, `PATCH/DELETE /inventory/:id` | ADMIN. Alta `{name, description?, stock ≥ 1, is_needed}`. Edición `{name?, description?, is_needed?}`. DELETE responde 409 si hay stock. |
| Admin · Ajustar stock de inventario | `PATCH /inventory/:id/stock {operation: increase\|decrease, quantity}` | Atómico. |
| Tienda · Carrito | `GET /sales/cart` → venta `DRAFT` o `null` | El carrito es la venta `DRAFT` del usuario del token. No toca el stock. |
| Tienda · Agregar / cambiar cantidad | `POST /sales/cart/items {productId: "7", quantity: 2}` → carrito | Cantidad **absoluta** (reemplaza). `productId` como string. No valida ni reserva stock. |
| Tienda · Quitar producto | `DELETE /sales/cart/items/:productId` → carrito o `null` | 404 si el producto no estaba en el carrito. |
| Tienda · Pagar | `POST /sales/checkout` (sin cuerpo) → `{sale, checkout}` | **Compras = SALES.** Reserva stock y pasa la venta a `PENDING`. Si falla, repone el stock y vuelve a `DRAFT`. `POST /sales` ya no existe. |
| Tienda · Cancelar checkout | `POST /sales/checkout/cancel` (sin cuerpo) | Cancela la compra pendiente desde «Mis compras»; requiere autenticación y cancela el checkout activo. |
| Donar ahora | `POST /donations/monetary {amount}` → `{donationId, checkout}` | **Donaciones = DONATION.** Máximo 2 decimales. Solo se envía el monto: nombre y documento salen del perfil de donante. |
| Plan Padrino · Suscribirse | `POST /donations/sponsor-plans {amount, frequency}` → plan con `cycles[0]` `PENDING` | `frequency`: `MONTHLY`, `QUARTERLY`, `SEMIANNUAL`, `ANNUAL`; `amount` en pesos **por cuota**; vigencia 12 meses. No trae checkout. 409 si ya hay un plan `ACTIVE`. |
| Plan Padrino · Pagar cuota | `POST /donations/sponsor-plans/cycles/:cycleId/checkout` → `{cycleId, donationId, checkout}` | Crea una donación `DON-*`; se abre en pestaña nueva como las demás. 409 si ya hay un checkout vigente: se avisa que complete el pago abierto o espere a que venza (no hay endpoint para recuperar ese enlace). |
| Mis donaciones · Plan Padrino | `GET /donations/sponsor-plans/me` → `[{sponsorPlanId, amount, frequency, status, startDate, endDate, cycles: [{cycleId, cycleNumber, dueDate, amount, status, donationId, paidAt, certificateIssued, certificateNumber}]}]` | Planes y cuotas: pagar cuotas `PENDING`/`OVERDUE`, cancelar el plan y certificado de cada cuota pagada (`GET /donations/monetary/:donationId/certificate`). El backend recalcula cuotas `OVERDUE` y el cierre al consultar. |
| Mis donaciones · Cancelar plan | `POST /donations/sponsor-plans/:planId/cancel` | Cancela el plan `ACTIVE` y sus cuotas `PENDING`/`OVERDUE`. 409 si ya no está activo. |
| Mis donaciones · Cancelar donación | `POST /donations/:donationId/cancel` (sin cuerpo) → `{message}` | Solo el titular y solo en `PENDING`; la transacción pasa a `DECLINED`. 409 si ya no está pendiente. |
| Mis donaciones · Monetarias | `GET /donations/monetary/me` + `GET /donations/monetary/:id/certificate` → PDF | Historial completo (no incluye cuotas del Plan Padrino). Las `PENDING` se pagan con `checkout_url` o se cancelan; las `APPROVED` descargan su certificado (`can_download_certificate`). |
| Mis donaciones · En especie | `GET /donations/inkind/me` + `GET /donations/inkind/:id/certificate` → PDF | Incluye las registradas por ADMIN antes de vincular la cuenta. |
| Certificados | — | **«Mis donaciones» es el único lugar donde se descargan certificados**; el recibo de `/payment-result` enlaza a la pestaña que corresponde. |
| Admin · Firmas de certificados | `POST /donations/signatures` (multipart: `legal_representative` y/o `tax_auditor`) → `{updated_roles, message}` | Solo ADMIN. PNG o JPEG. Se puede enviar una sola; la otra se conserva. No hay endpoint para consultar las firmas actuales. Sin firmas, los certificados responden 409. |
| Admin · Registrar donación en especie | `POST /donations/inkind {donation_date, notes?, donor_name, donor_document_type, donor_document_number, donor_email, items: [{inventory_item_id, quantity, estimated_unit_value?}]}` → `{donationId, certificate_number, certificate_pdf_base64}` | Solo ADMIN. Busca o crea al donante por documento, suma stock, emite el certificado y lo envía por correo; el panel permite descargarlo. 409 si faltan las firmas (enlaza a «Firmas de certificados»). |
| Resultado del pago | `GET /payments/:reference` | Estados: `PENDING`, `APPROVED`, `DECLINED`, `VOIDED`, `ERROR`. |
| Mis compras | `GET /sales/me` → `[{saleId, status, paymentStatus, transactionReference, paymentMethod, totalPrice, amountInCents, currency, checkoutUrl, createdAt, items: [{productId, name, quantity, unitPrice, subtotal}]}]` | Sin carritos `DRAFT`; la `PENDING` va primero y es la única con `checkoutUrl`. Reemplaza a `GET /payments/my-transactions`, que ya no existe. |
| Admin · Ventas registradas | `GET /sales` | Todas las ventas con su estado (`DRAFT`, `PENDING`, `APPROVED`, `DECLINED`). |

No se usa `POST /payments/checkout`: firma montos y referencias arbitrarias sin autenticación y no registra la venta ni la donación.

## Flujo de pago con Wompi (Sandbox)

1. El cliente paga su carrito (`POST /sales/checkout`) o confirma el monto (`POST /donations/monetary`).
2. El backend responde con `checkout = {reference, amountInCents, currency, customerEmail, publicKey, integritySignature, paymentUrl}`.
3. El pago se abre en una **pestaña nueva**, reservada en el mismo clic (`reserveCheckoutTab` en `src/core/utils/wompiWidget.js`) para que el navegador no la bloquee. Tienda, donación y cuota del Plan Padrino usan el `checkout.paymentUrl` de la respuesta; «Continuar con el pago» usa el `checkoutUrl` / `checkout_url` de `GET /sales/me` o `GET /donations/monetary/me`. A todos se les añade `redirect-url=<origen>/payment-result?reference=…`. Si el navegador bloquea la pestaña, se muestra un enlace «Abrir el pago en Wompi». Ya no se usa el widget embebido.
4. Al terminar el pago, Wompi lleva la pestaña nueva a `/payment-result?reference=…`; la pestaña original sigue en SUMA21. La referencia también queda guardada en este navegador.
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
| 6 | ✅ **Resuelto**: `GET /sales/me`, `GET /donations/monetary/me`, `GET /donations/inkind/me` y `GET /donations/sponsor-plans/me`. | — |
| 7 | Para productos no hay ajuste atómico de stock (para inventario sí). | `PATCH /api/v1/products/:id/stock {operation, quantity}`, como en inventario. Hoy se hace leer y luego escribir, con riesgo de carrera. |
| 8 | Mejoró: el stock ya no se toca al armar el carrito, solo se reserva en `POST /sales/checkout`. Pero un pago abandonado deja la venta en `PENDING` con el stock retenido (el 9 de noviembre de 2026 había 10 ventas `PENDING`). | Expiración de ventas `PENDING` o una reserva con tiempo límite. |
| 9 | `POST /donations/inkind` suma el stock de inmediato, aunque el cliente solo registra su intención. | Confirmar si debe quedar pendiente hasta que la fundación reciba los artículos. |
| 10 | No hay endpoint para reintentar el pago de una venta o donación existente. Un rechazo deja la venta en `DECLINED` y no devuelve los productos al carrito; el frontend lo resuelve volviendo a agregarlos. | Opcional: `POST /api/v1/sales/:id/checkout`, o que un rechazo devuelva los ítems al `DRAFT`. |
| 11 | Swagger marca `/products` e `/inventory` sin seguridad, aunque exigen token. La colección Postman de regresión aún incluye `/accounts` y `/payment-methods`, que ya no existen. | Actualizar la documentación. |
| 12 | Si en el panel de Wompi Sandbox la URL de eventos no apunta al webhook, los pagos se quedan en `PENDING`. | Confirmar que la URL de eventos es `https://suma21-backend.onrender.com/api/v1/payments/webhook` (o `/wompi/events`). |
| 13 | `PAYMENT_RETURN_URL` solo lo usa el cliente de enlaces de pago, que no participa en el flujo actual. | Nada que hacer en el frontend: el retorno lo define `redirect-url` en el enlace de pago. |
| 14 | `POST /donations/*` convierte `req.user.id` en entero (`idParam`): un servicio de auth con IDs no numéricos rompería las donaciones. | Confirmar que los IDs del servicio de auth son numéricos (las ventas existentes muestran `customerId: "1"`). |

## CORS verificado

| Origen | Backend de datos | Servicio de auth |
|---|---|---|
| `http://localhost:5173` | ✅ permitido | ❌ 403 |
| `http://127.0.0.1:5173` | ❌ | ❌ |
| `http://localhost:4173` (`vite preview` por defecto) | ❌ | ❌ |
| `https://suma21-frontend.onrender.com` | ✅ | ✅ |

Por eso `vite.config.js` fija el puerto 5173 con `strictPort` también para `vite preview`.
