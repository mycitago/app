// Casos mínimos del Hotfix V2
function norm(v){return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function categoryKey(v){
  const raw=norm(v);
  if(raw.includes('dental')||raw.includes('dent')) return 'dental';
  if(raw.includes('barber')) return 'barber';
  if(raw.includes('una')||raw.includes('nail')) return 'nails';
  return 'other';
}
console.assert(categoryKey('dental') === 'dental');
console.assert(categoryKey('Dentista') === 'dental');
console.assert(categoryKey('Barbería') === 'barber');
console.assert(categoryKey('Uñas') === 'nails');
console.log('OK Hotfix V2: detección de giro');
