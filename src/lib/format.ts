export const money = (n: number) =>
  n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

export const moneyBare = (n: number | null | undefined) =>
  '$' +
  (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtDate = (d: string | Date) => {
  if (!d) return '';
  // Las fechas "YYYY-MM-DD" se interpretan como UTC al usar new Date(string);
  // forzamos a tratarlas como local para evitar el día anterior en zonas negativas.
  const dt = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}(T|$)/.test(d)
    ? new Date(d.slice(0, 10) + 'T00:00:00')
    : new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

// Fecha y mes locales (YYYY-MM-DD / YYYY-MM) en la zona horaria del navegador/usuario.
// No usar new Date().toISOString() (UTC), que desfasa en zonas negativas.
export const todayLocal = (d: Date = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const monthLocal = (d: Date = new Date()) => todayLocal(d).slice(0, 7);

// Extrae un mensaje legible de un error desconocido (catch).
export function errMsg(e: unknown, fallback = 'Error'): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === 'string' && m) return m;
  }
  if (typeof e === 'string' && e) return e;
  return fallback;
}
