const FULL = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export function monthLabel(ym: string, short = false): string {
  const [y, m] = ym.split('-').map(Number);
  return short ? SHORT[m - 1] : `${FULL[m - 1]} ${y}`;
}

export const fmt = (v: number | null | undefined, digits = 0) =>
  v === null || v === undefined ? '—' : v.toLocaleString('ru-RU', { maximumFractionDigits: digits });

export const fmtPct = (v: number | null) => (v === null ? '—' : `${v.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%`);
