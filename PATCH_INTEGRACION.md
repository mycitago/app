# D3 --- Integración frontend

## admin/onboarding.html

Después de `<script src="../js/admin-onboarding.js"></script>` agrega:

``` html
<script src="../js/d3-onboarding-canonical.js?v=20260914-d3"></script>
```

Debe quedar antes de `citago-shell.js`.

## admin/servicios.html

Después de `<script src="../js/admin-services.js"></script>` agrega:

``` html
<script src="../js/d3-services-canonical.js?v=20260914-d3"></script>
```

## js/admin-services.js

Busca exactamente:

``` js
document.addEventListener('DOMContentLoaded',init);
```

y sustitúyelo por:

``` js
window.CitagoServicesLegacyInit=init;
```

Esto evita ejecutar dos inicializadores.

## Retiro del catálogo viejo

Después de verificar D3 en navegador, elimina de `js/admin-services.js`:

-   `const SERVICE_TEMPLATE_LIBRARY = { ... };`
-   `const SERVICE_CATEGORY_RULES = { ... };`

El adaptador D3 no usa esos objetos. `BUSINESS_CATEGORY_LABELS` puede
permanecer porque solo es presentación del giro bloqueado.

No modificar shell/sidebar/navegación, D4, D2, Reseñas, Crecimiento ni
Google Business.
