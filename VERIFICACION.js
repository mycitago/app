// Verificación lógica local del hotfix.
// No se ejecuta en producción; sirve como referencia de los casos esperados.

function normalize(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function stateFor(name, services) {
  const service = services.find(s => normalize(s.name) === normalize(name));
  if (!service) return 'new';
  return service.active === false ? 'inactive' : 'active';
}

const services = [
  { id: '1', name: 'Valoración dental', active: true },
  { id: '2', name: 'Limpieza dental', active: false }
];

console.assert(stateFor('Valoración dental', services) === 'active');
console.assert(stateFor('Limpieza dental', services) === 'inactive');
console.assert(stateFor('Corte clásico', services) === 'new');

console.log('OK: casos de plantilla nueva / activa / desactivada');
