(function() {
  'use strict';

  function applyAdaptiveBookingPreset(business) {
    const source = business?.business_category_id || business?.business_type || 'generic';
    const preset = window.resolveBookingPreset ? window.resolveBookingPreset(source) : null;
    if (!preset) return null;

    document.body.dataset.bookingPreset = preset.key;
    document.body.classList.add(preset.themeClass);
    document.documentElement.style.setProperty('--booking-accent', preset.accent);
    document.documentElement.style.setProperty('--booking-accent-soft', preset.accentSoft);
    document.documentElement.style.setProperty('--booking-surface-tint', preset.surfaceTint);

    const setText = (id, value) => {
      const node = document.getElementById(id);
      if (node && value) node.textContent = value;
    };

    setText('booking-kicker', preset.kicker);
    setText('booking-service-question', preset.serviceQuestion);
    setText('booking-service-subtitle', preset.serviceSubtitle);
    setText('booking-date-title', preset.dateTitle);
    setText('booking-form-title', preset.formTitle);
    setText('booking-success-title', preset.successTitle);
    setText('hero-eyebrow', preset.heroEyebrow);

    const search = document.getElementById('service-search');
    if (search) search.placeholder = preset.searchPlaceholder;

    document.title = `Reservar cita · ${business?.name || 'MyCitaGo'}`;
    return preset;
  }

  window.applyAdaptiveBookingPreset = applyAdaptiveBookingPreset;
})();
