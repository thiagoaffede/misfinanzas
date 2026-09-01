export const money = (n: number) =>
  n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

export const moneyBare = (n: number) =>
  '$' +
  n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtDate = (d: string | Date) => {
  const dt = new Date(d);
  return dt.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];
