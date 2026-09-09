# MyCitaGo — Rediseño de Configuración rápida

## Alcance
Este paquete implementa únicamente el rediseño visual/de claridad aprobado para el panel
Configuración rápida de `admin/servicios.html`.

## Archivos afectados
1. `js/admin-services.js`
2. `css/admin-services.css`

## JS
Dentro de `renderServiceTemplates()`, reemplazar exclusivamente la asignación actual de
`tools.innerHTML` por la incluida en `PATCH_admin-services.js.txt`.

Se conserva:
- `.svc-template-batch-tools`
- `#add-selected-templates`
- checkboxes
- `selectedTemplateNames`
- `openBatchTemplateReview`
- botones Usar
- flujo de creación

## CSS
Integrar las reglas de `PATCH_admin-services.css.txt` en las reglas existentes correspondientes.
NO pegar como un CSS v2/v3/v4 ni crear un archivo paralelo.

## Importante sobre Bloque 1 A+B
Este paquete NO incorpora el cambio de imágenes 54×42 → 72×56 ni gap 9→11.
Ese track permanece separado, tal como se pidió.

Sí contiene `color:#17151f` en `.svc-template-batch-tools` porque el rediseño aprobado
necesita resolver el contraste de la propia superficie clara.

## Resultado esperado
Paso 1:
- Tipo de negocio
- “Una sola opción”
- dropdown existente

Paso 2:
- “Elige servicios para agregar”
- “Selecciona una o varias plantillas”
- checkboxes existentes
- botón Agregar seleccionados

## Verificación
Después del deploy:
1. Abrir `https://mycitago.github.io/app/admin/servicios.html?v=<timestamp>`.
2. Confirmar contraste de todos los textos del panel.
3. Confirmar que el dropdown sigue seleccionando una sola categoría.
4. Confirmar que se pueden marcar varias plantillas.
5. Confirmar que “Agregar seleccionados” sigue abriendo la revisión por lote.
6. Probar <700 px y comprobar que el botón ocupa el ancho disponible.
7. Confirmar que ninguna otra sección cambió.

Estado: archivos de implementación preparados; NO significa desplegado en producción.
