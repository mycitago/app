
(function () {
  const BUSINESS_LABELS = {
    barberia: 'Barbería',
    salon_belleza: 'Salón de belleza',
    unas_spa: 'Spa y cuidado',
    clinica_estetica: 'Clínica',
    consultorio: 'Consultorio',
    dentista: 'Consultorio dental',
    veterinaria: 'Veterinaria',
    gimnasio: 'Entrenamiento',
    taller: 'Servicio técnico',
    asesoria: 'Servicios profesionales',
    educacion: 'Clases',
    fotografia: 'Estudio creativo',
    otro: 'Negocio'
  };

  function heroSvg(type) {
    const configs = {
      barberia: ['#090a0e','#221f24','#b28b67','BARBER'],
      salon_belleza: ['#241a29','#6e3c78','#dfa9d8','BEAUTY'],
      unas_spa: ['#412148','#ad6da7','#f2bfe2','SPA'],
      clinica_estetica: ['#0d3343','#2785a3','#a9e6f5','CLINIC'],
      consultorio: ['#17324a','#4c83a8','#d5eaf5','CONSULTA'],
      dentista: ['#173950','#47a2c2','#d8f4fb','DENTAL'],
      veterinaria: ['#244231','#6aa67d','#d6eddc','VET'],
      gimnasio: ['#201e2b','#a2403b','#ff8e58','TRAIN'],
      taller: ['#202631','#465a72','#b5c2d2','SERVICE'],
      asesoria: ['#171f3b','#4a5eaa','#bec8f3','PRO'],
      educacion: ['#30255a','#7a64c7','#d5ccfa','CLASS'],
      fotografia: ['#17171b','#4f405b','#d6aacd','STUDIO'],
      otro: ['#171820','#514f69','#a89fd8','CITAS']
    };
    const c = configs[type] || configs.otro;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="620" viewBox="0 0 1600 620">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="${c[0]}"/><stop offset=".58" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/>
        </linearGradient>
        <filter id="blur"><feGaussianBlur stdDeviation="26"/></filter>
      </defs>
      <rect width="1600" height="620" fill="url(#bg)"/>
      <circle cx="1330" cy="165" r="260" fill="white" opacity=".07"/>
      <circle cx="1120" cy="540" r="360" fill="black" opacity=".12"/>
      <rect x="910" y="105" width="430" height="350" rx="54" fill="white" opacity=".055" transform="rotate(-4 1125 280)"/>
      <rect x="1000" y="150" width="430" height="350" rx="54" fill="black" opacity=".12" transform="rotate(5 1215 325)"/>
      <text x="1160" y="340" text-anchor="middle" font-size="86" font-family="Arial" font-weight="700" fill="white" opacity=".16">${c[3]}</text>
      <path d="M0 520 C300 420 490 590 780 500 C1030 425 1210 450 1600 360 L1600 620 L0 620Z" fill="black" opacity=".13"/>
    </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function serviceSvg(label) {
    const clean = String(label || 'Servicio').slice(0, 22);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480">
      <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#171822"/><stop offset=".52" stop-color="#5d3fd6"/><stop offset="1" stop-color="#c053ca"/></linearGradient></defs>
      <rect width="720" height="480" rx="26" fill="url(#g)"/>
      <circle cx="570" cy="100" r="150" fill="white" opacity=".09"/>
      <circle cx="120" cy="420" r="180" fill="#27a8ff" opacity=".13"/>
      <text x="360" y="245" text-anchor="middle" font-family="Arial" font-size="72" fill="white" opacity=".88">✦</text>
      <text x="360" y="330" text-anchor="middle" font-family="Arial" font-weight="700" font-size="28" fill="white">${clean.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</text>
    </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function enhanceHero() {
    if (!window.state || !state.business) return;
    const b = state.business;
    const hero = document.getElementById('hero');
    if (!hero) return;

    if (!b.cover_image_url) {
      const img = heroSvg(b.business_type || 'otro');
      hero.style.backgroundImage =
        `linear-gradient(90deg,rgba(7,8,12,.91) 0%,rgba(7,8,12,.66) 44%,rgba(7,8,12,.15) 100%),url("${img}")`;
    }

    const address = document.getElementById('hero-address');
    if (address && !address.textContent.trim()) {
      address.textContent = BUSINESS_LABELS[b.business_type] || 'Reserva tu cita en línea';
    }
  }

  function enhanceCards() {
    const cards = document.querySelectorAll('.service-card');
    cards.forEach(card => {
      if (!card.querySelector('.service-card-img')) {
        const title = card.querySelector('h3')?.textContent || 'Servicio';
        const img = document.createElement('img');
        img.className = 'service-card-img';
        img.alt = '';
        img.src = serviceSvg(title);
        card.prepend(img);
      }
    });

    const count = document.getElementById('services-count');
    if (count) count.textContent = cards.length ? `${cards.length} opciones` : '';
  }

  function addObserver() {
    const list = document.getElementById('services-list');
    if (!list) return;
    const obs = new MutationObserver(enhanceCards);
    obs.observe(list, {childList:true,subtree:true});
    enhanceCards();
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      enhanceHero();
      addObserver();
    }, 500);
  });
})();
