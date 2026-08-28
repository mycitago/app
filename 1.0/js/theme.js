// =========================================================
// theme.js — Paletas de color para la página pública de reservación.
// Cada negocio guarda su elección en businesses.theme (columna ya
// existente desde sql/09_saas_pro.sql, antes sin usar).
//
// Usado por:
//  - js/app.js (página pública): aplica el tema del negocio al cargar
//  - admin/configuracion.html + js/admin-settings.js: selector + vista previa
// =========================================================

const THEMES = {
  rose: {
    label: 'Vino (default)',
    swatch: '#9C3049',
    vars: {
      '--color-primary': '#9C3049',
      '--color-primary-dark': '#7A2439',
      '--color-primary-light': '#F4DEE2',
      '--color-gold': '#B08A3E',
    },
  },
  sage: {
    label: 'Salvia',
    swatch: '#3E7C5C',
    vars: {
      '--color-primary': '#3E7C5C',
      '--color-primary-dark': '#2C5C44',
      '--color-primary-light': '#DCEFE4',
      '--color-gold': '#B08A3E',
    },
  },
  ocean: {
    label: 'Océano',
    swatch: '#2C6E8F',
    vars: {
      '--color-primary': '#2C6E8F',
      '--color-primary-dark': '#1F5169',
      '--color-primary-light': '#DCEBF2',
      '--color-gold': '#B08A3E',
    },
  },
  amber: {
    label: 'Ámbar',
    swatch: '#B4711E',
    vars: {
      '--color-primary': '#B4711E',
      '--color-primary-dark': '#8C5717',
      '--color-primary-light': '#F5E4CC',
      '--color-gold': '#8C5717',
    },
  },
  lavender: {
    label: 'Lavanda',
    swatch: '#7458A6',
    vars: {
      '--color-primary': '#7458A6',
      '--color-primary-dark': '#583F81',
      '--color-primary-light': '#E8E0F3',
      '--color-gold': '#B08A3E',
    },
  },
  charcoal: {
    label: 'Elegante (negro/dorado)',
    swatch: '#231F20',
    vars: {
      '--color-primary': '#231F20',
      '--color-primary-dark': '#000000',
      '--color-primary-light': '#E9E5E1',
      '--color-gold': '#B08A3E',
    },
  },
};

const DEFAULT_THEME = 'rose';

/** Aplica un tema al documento actual sobreescribiendo las variables CSS en :root. */
function applyTheme(themeId) {
  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => root.style.setProperty(key, value));
}
