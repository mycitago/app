# MyCitaGo — Servicios · archivos completos para producción

Reemplaza exactamente estos dos archivos en tu repo:

- `css/admin-services.css`
- `js/admin-services.js`

Incluye:
- Bloque 1 Parte A: contraste de `.svc-template-batch-tools`.
- Bloque 1 Parte B: imágenes 72×56 desktop, 48×38 mobile, gap 11.
- Rediseño aprobado de Configuración rápida:
  - Paso 1: Tipo de negocio · una sola opción.
  - Paso 2: Elige servicios para agregar · una o varias plantillas.
  - Mantiene dropdown, checkboxes, botón `Agregar seleccionados` y flujo funcional.

No toca:
- HTML
- shell
- Supabase/RLS
- otras secciones del formulario

Verificación ejecutada:
- Test RED contra el código anterior: falló como debía.
- Test GREEN contra los archivos finales: pasó.
- `node --check js/admin-services.js`: pasó.
- Llaves CSS balanceadas: sí.

Después de subir, abre:
`https://mycitago.github.io/app/admin/servicios.html?v=20260909-4`
