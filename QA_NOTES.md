# QA notes

Detalles pendientes y decisiones tomadas por no estar especificadas. Se revisan en la etapa 4.

## Decisiones (opción más simple)

- **Next.js 16**: se desactivaron `cacheComponents` y `partialPrefetching` que trae la plantilla; los datos son JSON estáticos y así se evita envolver rutas dinámicas en `<Suspense>`.
- **shadcn/ui**: la versión actual usa Base UI (no Radix) y el estilo `base-nova`. `Toast` está deprecado en shadcn; se usa `sonner`. Se añadieron además Tooltip, Switch, Label, Textarea, Separator, Progress y Skeleton (necesarios para Reports, Settings y el panel de acciones).
- **Fecha de referencia**: los datos se generan hasta `DEMO_TODAY = 2026-11-24` (`lib/format.ts`) para que el script sea determinista; la app usa esa misma fecha como "hoy".
- **Zona horaria**: todas las fechas se guardan en ISO UTC y se formatean en UTC para que servidor y cliente muestren lo mismo.
- **Motor de reglas adelantado**: las 5 reglas (`lib/rules/`) se escribieron en la etapa 0 porque el generador las usa para precalcular `risk`, `score` y `ruleHits`. Así los datos precalculados coinciden con lo que dará el motor en la etapa 2. La app todavía no las usa.
- **Score**: suma, por regla, del punto más alto entre las líneas de la orden; tope 100. Suspicious ≥ 70, Review 40–69.
- **Promedio del cliente** (quantity spike): promedio de las órdenes *anteriores* del cliente para ese producto en los últimos 90 días; se exige un mínimo de 3 órdenes previas.
- **Promedio de pares** (peer deviation): promedio por línea de los clientes del mismo tipo, excluyendo al propio cliente, sobre los 90 días.
- **Monthly cap**: se aplica solo a Schedule II; el umbral (60 unidades/mes por producto) es para retail y se escala por tipo: clinic ×0.75, LTC ×1.5, hospital ×4.
- **CSV de muestra**: 40 órdenes de una sola línea cada una (40 filas), fechadas hoy. `CardCode` = id del cliente e `ItemCode` = id del producto para poder cruzarlos. Cada fila se evalúa contra el historial de `orders.json` (no contra las otras filas del CSV).
- **`data/import-sample.json`**: archivo extra con las 40 filas del CSV ya evaluadas (precalculadas) para la pantalla de importación de la etapa 1.
- **reviews.json** incluye una entrada por cada orden marcada; las no decididas quedan `pending` con `reviewer: null`. Se decidió el 60 % más antiguo.

- **Carpeta**: el proyecto vive en `order-sentinel/` dentro de la carpeta del entorno (la raíz no estaba vacía: contiene el prompt).

### Etapa 1

- **Store en memoria** (`lib/store.ts`): módulo cliente con `useSyncExternalStore`. Las decisiones sobreviven a la navegación del lado del cliente, pero se pierden al recargar la página (la persistencia llega en la etapa 3). La fecha de una decisión de sesión usa el reloj real.
- **Revisor de la sesión**: "Compliance Officer (you)".
- **Acción rápida en Review Queue**: abre un diálogo que también exige nota (coherente con el detalle).
- **Órdenes no marcadas**: el panel de decisión también se muestra; se aclara que la decisión manual es opcional.
- **Riesgo acumulado de cliente**: promedio de sus 5 scores más altos en 90 días, con piso del 40 % del score máximo. Resultado: 6 suspicious, 25 review, 29 clear. Con "promedio de los 3 más altos" salían 14 sospechosos y las historias no destacaban.
- **Gráfico del cliente en el detalle de orden**: una pestaña por producto de la orden (primero los que activaron reglas); barras por orden, la actual en rojo, otras marcadas en ámbar y línea de promedio.
- **Reports**: cubre la fecha de negocio (11/24/2026). "Decisiones tomadas" = decisiones guardadas de ese día + todas las de la sesión, así que se llena al decidir en la demo.
- **Import**: en esta etapa, cualquier archivo (subido o de muestra) muestra los resultados precalculados del CSV de muestra.
- **Settings / Rules**: "Save" guarda en el store en memoria; todavía no afecta resultados.
- **Inventory "Generate daily report"**: muestra un toast y navega a Reports.
- **Tarjetas** con `rounded-lg` en lugar de `rounded-xl` (look más sobrio).

### Ajuste visual (inspirado en blupaxpharma.com)

- Se tomó inspiración general, sin copiar marca, logo ni nombre:
  - **Paleta** `brand-*` en `globals.css`: navy `#124F79` / `#0A2C45` y azul `#256CAA` / `#1D7EC0`. `--primary` = `#256CAA`.
  - **Sidebar** navy (`brand-900`) en lugar de `slate-900`; se aparta del prompt original a pedido del usuario.
  - **Titulares y cifras KPI** en **Barlow** (Google Fonts, libre) como sustituto de DIN 2014, que es una fuente de Adobe con licencia. El cuerpo sigue en Geist.
  - **Bordes** de 6 px, sin sombras: ya coincidía.
- **No** se adoptó su verde de marca para no confundirlo con el verde "Clear" del semáforo.

### Etapa 2

- **Motor en el servidor** (`lib/engine.ts`): la configuración activa vive en la memoria del servidor (`globalThis`, para que sobreviva al HMR). Las órdenes se evalúan con esa configuración y se cachean por configuración. Los campos precalculados de `orders.json` ya no se leen. Con la configuración por defecto, el motor reproduce exactamente los 1.172 resultados precalculados (verificado).
- **`(app)/layout.tsx` usa `dynamic = "force-dynamic"`**: los scores dependen de la configuración en memoria, así que cada página se renderiza por petición.
- **Estado de revisión bajo las reglas vigentes** (`reviewStatus` en `lib/data.ts`): una decisión registrada siempre manda; si no hay, una orden marcada queda `pending` y una clear no tiene estado. Si al subir umbrales una orden pendiente pasa a clear, sale de la cola; si al bajarlos aparecen nuevas marcadas, entran como `pending`.
- **Settings**: server actions `saveRuleConfig` y `previewRuleConfig`. Se valida la entrada: solo reglas conocidas y umbrales > 0, con tope de 10.000. Hay una barra de impacto en vivo (cuántas órdenes quedarían suspicious, review o clear) y un toast al guardar ("Flagged orders: 175 → 217"). `weight` no se expone: los puntos los define cada regla.
- **Import**: parser CSV propio (`lib/import.ts`, compatible con RFC 4180).
  - Busca el cliente por `CardCode` (o `CardName` exacto) y el producto por `ItemCode` (o `ItemName` exacto).
  - Agrupa por `DocNum` y evalúa cada orden contra el historial completo con la configuración activa, ubicándola a las 18:00 UTC de su `DocDate`.
  - Las órdenes importadas no se evalúan entre sí ni se guardan.
  - Las líneas inválidas se omiten y se listan con su número de línea; si faltan columnas, se rechaza el archivo. Límite de 2 MB.
  - La animación mínima de 2 s se mantiene.
- Se eliminó `data/import-sample.json`: ya no hace falta precalcular la importación.
- El store del cliente ya no guarda configuración de reglas.

### Etapa 3

- **Prisma 7.10.1 + SQLite** con el driver adapter de **libSQL** (`@prisma/adapter-libsql`). Se descartó `better-sqlite3` porque necesita compilar o descargar un binario en su `postinstall`, y npm 12 bloquea esos scripts. libSQL trae binarios precompilados como dependencias opcionales.
- **Prisma 7**: la URL va en `prisma.config.ts` (por defecto `file:./prisma/dev.db`, se puede cambiar con `DATABASE_URL`). El cliente se genera en `lib/generated/prisma` (ignorado por git; `postinstall` ejecuta `prisma generate`). `next.config.ts` marca libSQL como `serverExternalPackages`.
- **Modelos**: `Customer`, `Product`, `Order`, `OrderLine`, `InventoryItem`, `ReviewEvent` (auditoría) y `RuleSetting`. Los tipos tipo enum son `String`, porque SQLite no tiene enums.
- **Auditoría**: cada decisión es una fila de `ReviewEvent` (`fromStatus`, `toStatus`, `reviewer`, `note`, `source`, `createdAt`). El estado actual es el último evento; no hay una tabla "Review" aparte, para no duplicar datos. El seed convierte las 105 decisiones de `reviews.json` en eventos `source = "seed"`.
- **Lecturas**: `getSnapshot()` (`React.cache`, una vez por petición).
  - Customers, products, orders e inventory se cargan **una vez por proceso**: no cambian en ejecución.
  - Eventos y configuración se leen **en cada petición**.
  - Si se vuelve a sembrar con el servidor corriendo, hay que reiniciarlo.
- **Líneas de orden**: se consultan aparte y se unen en memoria. Un `include` genera un `IN (…)` con 1.172 parámetros y supera el límite de SQLite (error P2029).
- **Decisiones**: server action `lib/actions/review.ts`. Valida la decisión, exige nota (máx. 1.000 caracteres) y revalida todas las páginas. El revisor es "Compliance Officer" (usuario demo). Se eliminó el store en memoria (`lib/store.ts`).
- **Review Queue**: el tercer KPI pasa a "decisions recorded in the app" (eventos `source = "app"`).
- **Reports**: "Review decisions" = eventos con fecha de negocio 11/24/2026 + todos los registrados desde la app (con "estado anterior → nuevo").
- **Pruebas**: una decisión (ORD-101139, Escalated) sobrevive a la recarga y está en la base. Un umbral guardado (frequency = 5) sobrevive a un reinicio del servidor.

### Etapa 4 (QA)

- `tsc --noEmit`, `npm run lint` y `npm run build` sin errores ni advertencias. Además se arrancó `next start` y se recorrieron todas las rutas en producción (200).
- Lint: `SortIcon` estaba definido dentro del render de `OrdersTable` (regla `react-hooks/static-components`); se movió fuera. Se ignora `lib/generated/**`.
- Pantallas revisadas a 1280 px y 768 px.
- **Sidebar responsive**: fijo desde `lg` (1024 px); por debajo, botón de menú que abre un `Sheet` lateral.
- **Columnas secundarias**: Lines, Main rule y Schedules se ocultan en pantallas angostas para que las acciones rápidas de la cola queden visibles. El resto de tablas anchas hace scroll horizontal dentro de su tarjeta.
- **Buscador global**: un ID de orden (`ORD-…`) o de cliente (`CUS-…`) abre el detalle; cualquier otro texto abre Orders con `?q=`.
- **Página 404 propia** ("Record not found") para órdenes, clientes o rutas inexistentes.
- **Estados vacíos**: verificado en el navegador el de Orders sin resultados; el de archivo de import inválido se verificó con un script contra `lib/import.ts`. Customers sin resultados, cola vacía y reporte sin decisiones tienen su `EmptyState` o mensaje en el código, pero no se forzaron en el navegador.
- **Textos largos**: nombres de cliente y producto con `truncate` + `title`, y notas con `break-words`.
- Después de las pruebas se volvió a sembrar la base: 70 pendientes y umbrales por defecto.

### Despliegue en Vercel

- **URL**: https://order-sentinel-woad.vercel.app (proyecto `order-sentinel` en la cuenta del usuario, producción, público).
- **Build** (`vercel-build`): `prisma generate` → `prisma migrate deploy` → seed → `next build`. El `dev.db` sembrado se incluye en cada función (`outputFileTracingIncludes`) y `lib/db.ts` lo copia a `/tmp` al arrancar (el resto del sistema de archivos es de solo lectura).
- **Persistencia en Vercel solo de demo**: lo que se cambia vive en el `/tmp` de cada instancia. Se pierde al reciclarla o al redesplegar, y no se comparte entre instancias. Para persistencia real: `DATABASE_URL` apuntando a un libSQL hospedado (Turso), sin cambios de código.
- **`npm run setup`** pasó de `migrate reset` a `migrate deploy` + seed. Prisma 7 bloquea `migrate reset` cuando lo ejecuta un agente de IA, y el seed ya vacía las tablas.
- **Verificado en producción**: todas las rutas (200, 404 en la orden inexistente), lectura de la base (70 en revisión) y la importación de la muestra (3 marcadas). La primera llamada a una instancia fría tardó unos 10 s. **No** se probó una escritura (decisión o umbral) en Vercel, para no dejar datos de prueba en la demo pública.
- `.vercelignore` excluye `node_modules`, `.next`, el cliente generado y los `.db` locales.

## Pendientes / detalles

Resueltos en la etapa 4:
- ~~Reports: la columna "Status" no reflejaba decisiones de la sesión~~ → ahora sale de la base.
- ~~Buscador global solo visual~~ → funcional.
- ~~Sidebar fijo a 768 px~~ → menú lateral (`Sheet`).
- ~~Tablas anchas a 768 px~~ → columnas secundarias ocultas y scroll horizontal en el resto.

Abiertos (fuera de alcance del prompt):
- "Download PDF" sigue deshabilitado ("Coming soon").
- Las órdenes importadas se evalúan pero no se guardan.
- No hay autenticación real: cualquier credencial entra y todas las decisiones se registran como "Compliance Officer".
- npm 12 bloquea los scripts de instalación de `esbuild`, `prisma` y `@prisma/engines`. Todo funcionó sin ellos en esta máquina; si fallara en otra: `npm install-scripts approve esbuild prisma @prisma/engines`.
- `create-next-app` generó `AGENTS.md` (reglas para agentes de Next 16); se deja como está.
