import type { Case, Dataset, Direction, Meeting, RegionGroup } from './types.ts';
import { addDays } from './demo.ts';

const MONTHS: Record<string, number> = {
  январь: 1, февраль: 2, март: 3, апрель: 4, май: 5, июнь: 6,
  июль: 7, август: 8, сентябрь: 9, октябрь: 10, ноябрь: 11, декабрь: 12,
};

export interface RawSheet {
  sheet: string;
  data: unknown[][];
}

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());

function direction(raw: string): Direction | null {
  const s = raw.toLowerCase().replace(/[\s.-]/g, '');
  if (!s) return null;
  if (s.startsWith('вз')) return 'adult';
  if (s.startsWith('дет') || s.startsWith('под') || s.startsWith('род')) return 'detrod';
  return null;
}

function region(city: string): RegionGroup {
  const s = city.toLowerCase();
  if (/\(мо\)|област/.test(s)) return 'regions';
  return /москва|санкт|спб|петербург/.test(s) ? 'capitals' : 'regions';
}

function ageGroup(info: string, dir: Direction): string {
  const s = info.toLowerCase();
  if (/мама|папа|родител/.test(s)) return 'родитель';
  const m = s.match(/(\d{1,2})\s*лет/);
  if (!m) return 'не указан';
  const a = Number(m[1]);
  if (dir === 'detrod') return a < 13 ? 'до 13' : a < 18 ? '13-17' : 'родитель';
  return a < 35 ? '18-34' : a < 55 ? '35-54' : '55+';
}

const validDate = (y: number, m: number, d: number) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

/** Разбор файла «Консультации»: вкладка на каждого специалиста, строка клиента, колонки дней. */
export function parseConsultations(sheets: RawSheet[], year: number): Dataset {
  const cases: Case[] = [];
  const meetings: Meeting[] = [];
  const warnings: string[] = [];
  let sheetsUsed = 0;

  for (const { sheet, data } of sheets) {
    const hr = data.findIndex((row) => str(row?.[1]) === 'Город');
    if (hr < 0) continue; // не вкладка со специалистом (например, «Пояснения»)
    sheetsUsed++;

    let specialist = sheet;
    for (const row of data.slice(0, hr)) {
      const hit = (row ?? []).map(str).find((c) => /^специалист/i.test(c));
      if (hit) {
        specialist = hit;
        break;
      }
    }

    // строка с названиями месяцев: та, где их больше всего
    let monthRow: unknown[] = [];
    let best = 0;
    for (const row of data.slice(Math.max(0, hr - 4), hr)) {
      const n = (row ?? []).filter((c) => str(c).toLowerCase() in MONTHS).length;
      if (n > best) {
        best = n;
        monthRow = row;
      }
    }
    const markers = monthRow
      .map((c, i) => ({ i, m: MONTHS[str(c).toLowerCase()] }))
      .filter((x) => x.m)
      .sort((a, b) => a.i - b.i);
    if (!markers.length) {
      warnings.push(`Вкладка «${sheet}»: не найдена строка с названиями месяцев, пропущена.`);
      continue;
    }

    const dayCols: { col: number; date: string }[] = [];
    (data[hr] ?? []).forEach((v, col) => {
      if (col < 8 || typeof v !== 'number') return;
      const mk = [...markers].reverse().find((x) => x.i <= col);
      if (mk && validDate(year, mk.m, v)) {
        dayCols.push({ col, date: `${year}-${String(mk.m).padStart(2, '0')}-${String(v).padStart(2, '0')}` });
      }
    });

    for (let r = hr + 1; r < data.length; r++) {
      const row = data[r] ?? [];
      const key = str(row[3]);
      const mine: Meeting[] = [];
      const id = `${sheet}-${r + 1}`;
      for (const { col, date } of dayCols) {
        const v = row[col];
        if (typeof v === 'number' && v > 0) mine.push({ caseId: id, date, status: 'held', hours: v });
      }
      if (!key && !mine.length) continue;

      const dir = direction(str(row[4]));
      if (!dir) warnings.push(`${sheet}, строка ${r + 1}: не распознан тип клиента «${str(row[4])}», принят как взрослый.`);
      const d: Direction = dir ?? 'adult';
      mine.sort((a, b) => (a.date < b.date ? -1 : 1));
      const first = mine[0]?.date ?? `${year}-01-01`;

      cases.push({
        id,
        clientKey: key || id,
        direction: d,
        specialist,
        city: str(row[1]) || 'не указан',
        regionGroup: region(str(row[1])),
        ageGroup: ageGroup(str(row[5]), d),
        project: 'Не указан',
        createdAt: first,
        assignedAt: first,
        status: 'in_work',
        closedAt: null,
        closeReason: null,
      });
      meetings.push(...mine);
    }
  }

  if (!sheetsUsed) throw new Error('В файле не найдено ни одной вкладки с колонкой «Город» в шапке.');

  // Цвет строки (в работе / завершили) из файла не читается: ориентируемся на последнюю встречу.
  const last = meetings.reduce((m, x) => (x.date > m ? x.date : m), '0000');
  const border = addDays(last, -45);
  const lastBy = new Map<string, string>();
  for (const m of meetings) if ((lastBy.get(m.caseId) ?? '') < m.date) lastBy.set(m.caseId, m.date);
  for (const c of cases) {
    const l = lastBy.get(c.id);
    if (l && l < border) {
      c.status = 'done';
      c.closedAt = l;
    }
  }

  warnings.unshift(
    'Из «Консультаций» нет дат обращения, проекта и причин завершения: обращения и очередь появятся после загрузки «Базы обращений» или из CRM. Дата обращения и передачи принята за дату первой встречи, статус «завершено» определён по паузе больше 45 дней.'
  );

  return {
    source: 'excel',
    label: `Загружено из файла, ${cases.length} клиентов, ${meetings.length} встреч`,
    cases,
    meetings,
    warnings,
  };
}
