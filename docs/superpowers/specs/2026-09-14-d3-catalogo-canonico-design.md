# D3 · Catálogo canónico de servicios (R2)

**Fecha:** 2026-09-14  
**Estado:** Especificación aprobada en diseño; pendiente de revisión final del usuario antes de plan de implementación.

## 1. Objetivo

Eliminar la duplicidad de fuentes de plantillas de servicios y convertir `public.service_templates` en la única fuente funcional de verdad para:

- `admin/onboarding.html` / `js/admin-onboarding.js`
- `admin/servicios.html` / `js/admin-services.js`

El bloque D3 debe resolver únicamente R2: catálogo duplicado/no canónico.

## 2. Fuera de alcance

D3 no debe absorber otros frentes:

- **R5 / F3:** no se cambia el shell, sidebar, navegación, ni se hace consolidación visual completa.
- **D4:** no se agregan ni modifican límites por plan; no se introduce `max_services`.
- **D2:** no se toca Mercado Pago ni pagos.
- No se toca Reseñas.
- No se toca Crecimiento.
- No se toca Google Business Profile.
- No se cambia todavía la política RLS global de lectura de `service_templates`.

## 3. Estado actual confirmado

### 3.1 Onboarding

`js/admin-onboarding.js` ya consulta `service_templates` por `business_category_id` y `active=true`.

También:

- usa `business_category_id` del negocio;
- respeta `business_category_locked`;
- carga servicios existentes del negocio;
- compara servicios existentes por nombre normalizado;
- actualiza el servicio existente si coincide, en lugar de duplicarlo.

### 3.2 Servicios

`js/admin-services.js` mantiene actualmente un `SERVICE_TEMPLATE_LIBRARY` hardcodeado que duplica el catálogo.

Este catálogo también se usa para:

- resolver el giro actual;
- decidir categorías válidas;
- renderizar plantillas;
- validar que una plantilla corresponde al giro.

D3 elimina este objeto como **fuente funcional** una vez que esas rutas dependan del catálogo canónico.

### 3.3 Persistencia de servicios existentes

`public.services` no tiene una dependencia obligatoria con `service_templates`:

- no existe `template_id`;
- cada servicio conserva nombre, precio, duración, categoría, imagen, buffer, anticipo, estado y demás datos de manera independiente.

Por lo tanto, el cambio de fuente de plantillas no modifica ni elimina servicios existentes.

## 4. Diseño de seguridad

Se agregará un RPC:

```sql
public.get_business_service_templates(p_business_id uuid)
```

### 4.1 Tipo de función

Será `SECURITY DEFINER`.

No confiará en el RLS de `businesses` como única barrera de acceso.

La función deberá validar explícitamente la identidad y membresía del llamador antes de devolver filas.

### 4.2 Regla de autorización

Flujo obligatorio:

1. obtener `auth.uid()`;
2. rechazar si no existe usuario autenticado;
3. validar que el usuario sea miembro activo de `p_business_id` usando el patrón multi-tenant ya existente (`is_member_of(p_business_id)` o una comprobación equivalente);
4. opcionalmente permitir `is_platform_admin()` si el patrón actual del sistema lo requiere;
5. leer `businesses.business_category_id` del negocio solicitado;
6. devolver solo plantillas donde:
   - `business_category_id` coincide con el giro real del negocio;
   - `active = true`;
7. no aceptar un giro enviado desde frontend como fuente de autorización.

### 4.3 Permisos de ejecución

Después de crear la función:

```sql
REVOKE ALL ON FUNCTION public.get_business_service_templates(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_business_service_templates(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_business_service_templates(uuid) TO authenticated;
```

Resultado esperado:

- `anon`: no puede ejecutar.
- `authenticated` sin membresía: `forbidden`.
- miembro del negocio: recibe únicamente plantillas activas de su giro.
- pasar el `business_id` de otro tenant no debe revelar plantillas de ese negocio.

### 4.4 `search_path`

Al ser `SECURITY DEFINER`, la función deberá fijar explícitamente un `search_path` seguro, por ejemplo:

```sql
SET search_path = public, pg_temp
```

y referenciar objetos críticos con esquema explícito cuando corresponda.

## 5. Fuente canónica

Después de D3, el flujo será:

```text
businesses.business_category_id
            ↓
get_business_service_templates(p_business_id)
            ↓
      service_templates
        ↙           ↘
 Onboarding       Servicios
```

Ningún frontend debe decidir qué catálogo consultar pasando un `business_category_id` como parámetro de confianza.

## 6. Cambios en Onboarding

`js/admin-onboarding.js` dejará de consultar directamente:

```js
supabaseClient
  .from('service_templates')
  .select('*')
  .eq('business_category_id', category)
```

y usará:

```js
supabaseClient.rpc('get_business_service_templates', {
  p_business_id: onboardingBiz.id
})
```

### Compatibilidad

Si el negocio:

- ya tiene `business_category_id`, se usa ese valor;
- ya tiene el giro bloqueado, no se modifica;
- ya tiene servicios, se conservan;
- tiene servicios cuyo nombre coincide con una plantilla, se sigue evitando duplicación;
- está a mitad del onboarding, continúa desde su estado actual sin migración forzada.

No se añade persistencia nueva para selecciones de plantilla aún no guardadas en el navegador.

## 7. Cambios en Servicios

`js/admin-services.js` deberá migrar las rutas que actualmente dependen de `SERVICE_TEMPLATE_LIBRARY` a datos obtenidos por el RPC.

### Debe conservarse

- edición de servicios existentes;
- precio;
- duración;
- buffer;
- anticipo;
- imagen;
- disponibilidad;
- personal asignado;
- costos y campos avanzados;
- visibilidad/activo;
- duplicación y acciones existentes que no dependan del catálogo duplicado.

### Experiencia inicial

La configuración rápida se simplifica a:

```text
Plantilla → Precio → Guardar
```

Las opciones avanzadas permanecen disponibles debajo; no se eliminan.

### Giro

El selector de giro continúa bloqueado conforme a `business_category_id` / `business_category_locked`.

D3 no cambia la navegación ni la estructura general del shell actual.

## 8. Eliminación de `SERVICE_TEMPLATE_LIBRARY`

La constante hardcodeada no se elimina hasta que las pruebas confirmen que:

- renderizado de plantillas;
- selección de plantillas;
- validación de giro;
- precios sugeridos;
- imágenes sugeridas;
- categorías derivadas;

ya funcionan con la respuesta del RPC o con datos derivados de ella.

Una vez cumplido, `SERVICE_TEMPLATE_LIBRARY` deja de ser fuente funcional y se retira junto con helpers que solo existan para ese catálogo hardcodeado.

No se conservará como fallback silencioso, porque eso volvería a crear dos fuentes de verdad.

## 9. Plan de compatibilidad para negocios existentes

No habrá migración masiva de `services`.

D3 no modifica servicios existentes salvo cuando el usuario explícitamente edite/guarde un servicio desde la UI.

Para negocios con onboarding incompleto:

1. cargar negocio;
2. respetar `business_category_id` si existe;
3. cargar plantillas canónicas mediante RPC;
4. cargar `services` existentes;
5. marcar coincidencias por nombre normalizado;
6. continuar el flujo normal.

## 10. RLS de `service_templates`

La política actual de lectura directa permite a `anon` y `authenticated` leer plantillas activas.

**D3 no la cambia.**

Razón: antes de cerrar ese SELECT se debe confirmar el inventario completo de consumidores de `service_templates`.

### Pendiente futuro registrado

Crear un bloque de seguridad posterior para:

1. inventariar todos los consumidores directos de `service_templates`;
2. migrarlos a interfaces seguras/canónicas;
3. cerrar o restringir `service_templates_read`;
4. verificar que no se rompe ninguna ruta pública o administrativa.

Este pendiente no debe perderse al cerrar D3.

## 11. Pruebas obligatorias

### Backend / RPC

- usuario autenticado miembro obtiene plantillas de su negocio;
- miembro de Barbería no obtiene Dental/Spa;
- usuario autenticado sin membresía recibe `forbidden`;
- `anon` no puede ejecutar el RPC;
- negocio sin `business_category_id` devuelve conjunto vacío o error controlado definido por implementación;
- solo devuelve `active=true`.

### Onboarding

- carga plantillas del RPC;
- conserva los 4 pasos actuales;
- negocio a mitad de onboarding continúa;
- servicios existentes no se duplican;
- selección y guardado siguen funcionando.

### Servicios

- carga plantillas del RPC;
- no depende de `SERVICE_TEMPLATE_LIBRARY`;
- giro bloqueado se mantiene;
- servicios existentes siguen visibles y editables;
- `Plantilla → Precio → Guardar` funciona;
- opciones avanzadas siguen disponibles.

### Regresión

- no hay cambios a shell/sidebar;
- no hay cambios a D4;
- no hay cambios a pagos;
- no hay cambios a Reseñas/Crecimiento/Google Business;
- `services` existentes permanecen intactos.

## 12. Criterio de cierre de D3

D3 se considera completo únicamente cuando:

- Onboarding y Servicios consumen la misma fuente canónica;
- el RPC aplica aislamiento por membresía;
- `anon` no puede ejecutar el RPC;
- `SERVICE_TEMPLATE_LIBRARY` ya no es fuente funcional;
- negocios existentes conservan sus servicios;
- negocios a medio onboarding pueden continuar;
- las pruebas de regresión anteriores pasan;
- no se han introducido cambios de R5, D4 o D2.
