# MyCitaGo — Corrección de zona horaria

## Archivos del paquete

### Reemplazar completos
- `admin/sucursales.html`
- `js/admin-branches.js`

### Archivo nuevo
- `js/dashboard-timezone-fix.js`

### Editar con dos reemplazos exactos
- `admin/index.html`
- Las instrucciones están en `PATCH_admin-index.txt`.

## Resultado
1. Dashboard → “Configurar zona horaria” abre Sucursales.
2. Se abre automáticamente la sucursal principal.
3. El campo Zona horaria queda resaltado y enfocado.
4. Para Veracruz: elegir “Centro de México”.
5. Al guardar, regresa al dashboard.
6. El % de completitud incluye zona horaria.
7. Citas hoy, próximas citas e ingresos del mes usan la fecha operativa del negocio.
8. Si no hay timezone, el dashboard muestra “—” en datos dependientes de la fecha en vez de fingir valores confiables.

## Después de subir
Abrir:
`https://mycitago.github.io/app/admin/index.html?v=20260909-timezone1`

Pulsar “Configurar zona horaria”.
Debe abrir:
`sucursales.html?focus=timezone&return=index.html`

Selecciona para Veracruz:
`Centro de México — America/Mexico_City`

Guarda y verifica que el aviso desaparezca al volver al dashboard.
