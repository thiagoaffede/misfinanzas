// Helpers de fecha en horario de Argentina (America/Argentina/Buenos_Aires, UTC-3)
// Evita el desfase de usar new Date().toISOString() (UTC) en zonas negativas.

/** Fecha local (YYYY-MM-DD) en Argentina. */
export function localDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  // en-CA produce YYYY-MM-DD
  return parts;
}

/** Mes local (YYYY-MM) en Argentina. */
export function localMonth(now: Date = new Date()): string {
  return localDate(now).slice(0, 7);
}
