(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.BOOKING_PRESETS = api.BOOKING_PRESETS;
    root.resolveBookingPreset = api.resolveBookingPreset;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const BOOKING_PRESETS = {
    dental: {
      key: 'dental',
      themeClass: 'booking-theme-dental',
      kicker: 'Atención dental',
      serviceQuestion: '¿Qué tratamiento necesitas?',
      serviceSubtitle: 'Selecciona el tratamiento y encuentra un horario disponible.',
      searchPlaceholder: 'Buscar tratamiento…',
      dateTitle: 'Elige fecha y hora',
      formTitle: 'Datos del paciente',
      successTitle: '¡Tu cita quedó confirmada!',
      heroEyebrow: 'Reserva dental en línea',
      accent: '#087e8b',
      accentSoft: '#e9f8f8',
      surfaceTint: '#f5fbfb'
    },
    beauty: {
      key: 'beauty',
      themeClass: 'booking-theme-beauty',
      kicker: 'Belleza y cuidado',
      serviceQuestion: '¿Qué servicio quieres reservar?',
      serviceSubtitle: 'Elige el servicio ideal para ti y encuentra tu horario.',
      searchPlaceholder: 'Buscar servicio…',
      dateTitle: 'Elige tu horario',
      formTitle: 'Tus datos',
      successTitle: '¡Tu cita quedó reservada!',
      heroEyebrow: 'Reserva tu experiencia',
      accent: '#9a4f75',
      accentSoft: '#faedf4',
      surfaceTint: '#fff9fc'
    },
    barber: {
      key: 'barber',
      themeClass: 'booking-theme-barber',
      kicker: 'Reserva rápida',
      serviceQuestion: '¿Qué servicio necesitas?',
      serviceSubtitle: 'Selecciona, elige horario y listo.',
      searchPlaceholder: 'Buscar corte o servicio…',
      dateTitle: 'Elige fecha y hora',
      formTitle: 'Tus datos',
      successTitle: '¡Reserva confirmada!',
      heroEyebrow: 'Agenda en línea',
      accent: '#263238',
      accentSoft: '#eef1f2',
      surfaceTint: '#f8f9f9'
    },
    veterinary: {
      key: 'veterinary',
      themeClass: 'booking-theme-veterinary',
      kicker: 'Cuidado veterinario',
      serviceQuestion: '¿Qué atención necesita tu mascota?',
      serviceSubtitle: 'Selecciona el servicio y encuentra un horario disponible.',
      searchPlaceholder: 'Buscar consulta o servicio…',
      dateTitle: 'Elige fecha y hora',
      formTitle: 'Datos de contacto',
      successTitle: '¡Cita veterinaria confirmada!',
      heroEyebrow: 'Reserva veterinaria',
      accent: '#397a58',
      accentSoft: '#eaf6ee',
      surfaceTint: '#f7fcf8'
    },
    psychology: {
      key: 'psychology',
      themeClass: 'booking-theme-psychology',
      kicker: 'Atención profesional',
      serviceQuestion: 'Selecciona el tipo de sesión',
      serviceSubtitle: 'Encuentra un horario con calma y en pocos pasos.',
      searchPlaceholder: 'Buscar sesión…',
      dateTitle: 'Encuentra un horario',
      formTitle: 'Tus datos',
      successTitle: 'Tu sesión quedó reservada',
      heroEyebrow: 'Reserva privada',
      accent: '#65766a',
      accentSoft: '#eef3ef',
      surfaceTint: '#fafcfa'
    },
    spa: {
      key: 'spa',
      themeClass: 'booking-theme-spa',
      kicker: 'Bienestar',
      serviceQuestion: '¿Qué tratamiento quieres disfrutar?',
      serviceSubtitle: 'Elige tu tratamiento y encuentra el momento ideal.',
      searchPlaceholder: 'Buscar tratamiento…',
      dateTitle: 'Elige tu momento',
      formTitle: 'Tus datos',
      successTitle: '¡Tu experiencia quedó reservada!',
      heroEyebrow: 'Reserva bienestar',
      accent: '#8a6f72',
      accentSoft: '#f6eeee',
      surfaceTint: '#fdfafa'
    },
    generic: {
      key: 'generic',
      themeClass: 'booking-theme-generic',
      kicker: 'Reserva en línea',
      serviceQuestion: '¿Qué servicio quieres reservar?',
      serviceSubtitle: 'Selecciona un servicio y encuentra un horario disponible.',
      searchPlaceholder: 'Buscar servicio…',
      dateTitle: 'Elige fecha y hora',
      formTitle: 'Tus datos',
      successTitle: '¡Cita confirmada!',
      heroEyebrow: 'Reserva en línea',
      accent: '#4e5bd5',
      accentSoft: '#eef0ff',
      surfaceTint: '#fafaff'
    }
  };

  const aliases = {
    dental: 'dental', dentista: 'dental', dentist: 'dental', consultorio_dental: 'dental',
    beauty: 'beauty', estetica: 'beauty', 'estética': 'beauty', salon_belleza: 'beauty',
    clinica_estetica: 'beauty', nails: 'beauty', unas: 'beauty', 'uñas': 'beauty',
    barber: 'barber', barberia: 'barber', 'barbería': 'barber',
    veterinary: 'veterinary', veterinaria: 'veterinary', veterinario: 'veterinary',
    psychology: 'psychology', psicologia: 'psychology', 'psicología': 'psychology',
    terapia: 'psychology', therapy: 'psychology',
    spa: 'spa', wellness: 'spa', masaje: 'spa', masajes: 'spa'
  };

  function normalize(value) {
    return String(value || '')
      .trim()
      .toLocaleLowerCase('es-MX')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');
  }

  function resolveBookingPreset(value) {
    const normalized = normalize(value);
    const alias = aliases[normalized] || aliases[normalized.replace(/_/g, '')];
    return BOOKING_PRESETS[alias] || BOOKING_PRESETS.generic;
  }

  return { BOOKING_PRESETS, resolveBookingPreset };
});
