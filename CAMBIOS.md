# Cambios — MyCitaGo Shell V3

## `js/citago-shell.js`

Se agregan dos preferencias locales:

```js
const CT_THEME_KEY='mycitago:tenant-theme';
const CT_SIDEBAR_KEY='mycitago:sidebar-collapsed';
```

Se agrega tema real `light | dark | system`, usando `matchMedia('(prefers-color-scheme: dark)')`.

Se agrega un selector de apariencia dentro del menú de usuario tenant:

```text
Apariencia
[ Claro ] [ Oscuro ] [ Sistema ]
```

Se agrega botón desktop para contraer/expandir el sidebar y persistencia del estado.

`nav()` se divide en desktop/mobile:
- Desktop: iconos Lucide homogéneos y `aria-current`.
- Mobile: conserva los símbolos actuales y la navegación existente.

## `css/citago-admin.css`

Se agregan variables oscuras sobre `data-ct-theme="dark"`.

Se tematizan:
- shell
- topbar
- búsqueda
- menú de usuario
- dialogs
- inputs
- superficies comunes del Dashboard/Servicios/Admin

Se agrega Sidebar V2/V3:
- filas 44px
- iconos fijos
- active/focus homogéneos
- ancho compacto 76px
- ocultamiento de textos/grupos solo en desktop

## Rollback

Si algo falla, revertir únicamente estos dos archivos desde Git:

```text
js/citago-shell.js
css/citago-admin.css
```

No hay cambios de base de datos.
