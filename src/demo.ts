import type { Case, Dataset, Direction, Meeting, MeetingStatus, RegionGroup } from './types.ts';

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * 86_400_000).toISOString().slice(0, 10);

const SPECIALISTS: Record<Direction, string[]> = {
  adult: ['Специалистка А1', 'Специалистка А2'],
  detrod: ['Специалистка Д1', 'Специалистка Д2', 'Специалистка Д3'],
};
const AGES: Record<Direction, string[]> = {
  adult: ['18-34', '35-54', '55+'],
  detrod: ['до 13', '13-17', 'родитель'],
};
const CAPITALS = ['Москва', 'Санкт-Петербург'];
const REGIONS = ['Самара', 'Уфа', 'Иркутск', 'Пермь', 'Томск', 'Казань', 'Краснодар', 'Новосибирск', 'Подольск (МО)', 'Воронеж'];
const PROJECTS: [string, number][] = [['Абсолют-Помощь', 0.35], ['Другие гранты', 0.25], ['Без проекта', 0.4]];
const REASONS: [string, number][] = [['Курс закончен', 0.6], ['Прекратил(а) сам(а)', 0.3], ['Перенаправлен(а)', 0.1]];

export const DEMO_CUTOFF = '2026-10-31';

export function makeDemo(): Dataset {
  const r = rng(20261109);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const weighted = (w: [string, number][]) => {
    let x = r();
    for (const [v, p] of w) {
      if ((x -= p) <= 0) return v;
    }
    return w[0][0];
  };

  const cases: Case[] = [];
  const meetings: Meeting[] = [];
  const clientKeys: string[] = [];

  for (let idx = -3; idx <= 9; idx++) {
    const year = idx < 0 ? 2025 : 2026;
    const mo = idx < 0 ? 12 + idx + 1 : idx + 1;
    const n = 44 + Math.floor(r() * 24);
    for (let i = 0; i < n; i++) {
      const id = `C-${String(cases.length + 1).padStart(4, '0')}`;
      const day = 1 + Math.floor(r() * 28);
      const createdAt = `${year}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const direction: Direction = r() < 0.52 ? 'detrod' : 'adult';
      const capital = r() < 0.47;
      const city = capital ? pick(CAPITALS) : pick(REGIONS);
      const regionGroup: RegionGroup = capital ? 'capitals' : 'regions';
      const repeat = clientKeys.length > 20 && r() < 0.06;
      const clientKey = repeat ? pick(clientKeys) : `K-${String(clientKeys.length + 1).padStart(4, '0')}`;
      if (!repeat) clientKeys.push(clientKey);

      const c: Case = {
        id, clientKey, direction, specialist: null, city, regionGroup,
        ageGroup: pick(AGES[direction]),
        project: weighted(PROJECTS),
        createdAt, assignedAt: null, status: 'queue', closedAt: null, closeReason: null,
      };

      if (r() < 0.06) {
        c.status = 'not_started';
        c.closedAt = addDays(createdAt, 5 + Math.floor(r() * 20));
        c.closeReason = 'Не вышел на связь';
        if (c.closedAt > DEMO_CUTOFF) {
          c.status = 'queue';
          c.closedAt = null;
          c.closeReason = null;
        }
      } else {
        const wait = Math.round(-Math.log(1 - r()) * 55);
        const assignedAt = addDays(createdAt, wait);
        if (assignedAt <= DEMO_CUTOFF) {
          c.assignedAt = assignedAt;
          c.specialist = pick(SPECIALISTS[direction]);
          c.status = 'in_work';
          const planned = 3 + Math.floor(r() * 12);
          let date = addDays(assignedAt, 3 + Math.floor(r() * 8));
          let last = date;
          let finished = true;
          for (let k = 0; k < planned; k++) {
            if (date > DEMO_CUTOFF) {
              finished = false;
              break;
            }
            const x = r();
            const status: MeetingStatus = x < 0.88 ? 'held' : x < 0.95 ? 'cancel_client' : x < 0.98 ? 'cancel_spec' : 'no_show';
            meetings.push({ caseId: id, date, status, hours: status === 'held' && r() < 0.05 ? 1.5 : 1 });
            last = date;
            date = addDays(date, 7 + Math.floor(r() * 4));
          }
          if (finished && last <= addDays(DEMO_CUTOFF, -14)) {
            c.status = 'done';
            c.closedAt = last;
            c.closeReason = weighted(REASONS);
          }
        }
      }
      cases.push(c);
    }
  }

  return {
    source: 'demo',
    label: 'Демо: вымышленные данные, октябрь 2025 - октябрь 2026',
    cases,
    meetings,
    warnings: [],
  };
}
