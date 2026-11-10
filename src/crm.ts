import type { Case, CaseStatus, Dataset, Direction, Meeting, MeetingStatus, RegionGroup } from './types.ts';

/**
 * Слой записи. В прототипе изменения применяются к данным в браузере.
 * В рабочей версии каждая из этих операций превращается в запрос к Битрикс24:
 * createCase → crm.deal.add, assign/close → crm.deal.update (стадия и поля),
 * addMeeting → запись в журнал встреч. Панель только отправляет изменение и показывает результат,
 * а хранит данные CRM.
 */

export type Role = { kind: 'admin' } | { kind: 'specialist'; name: string };

export const CLOSE_REASONS = ['Курс закончен', 'Клиент прекратил работу', 'Перенаправлен к другому специалисту'];
export const NOT_STARTED_REASONS = ['Не вышел на связь', 'Отказался от помощи', 'Не подошла форма помощи'];

export const AGE_GROUPS: Record<Direction, string[]> = {
  adult: ['18-34', '35-54', '55+', 'не указан'],
  detrod: ['до 13', '13-17', 'родитель', 'не указан'],
};

export const MEETING_LABEL: Record<MeetingStatus, string> = {
  held: 'Состоялась',
  cancel_client: 'Отмена клиентом',
  cancel_spec: 'Отмена специалистом',
  no_show: 'Неявка',
};

export const today = () => new Date().toISOString().slice(0, 10);

const touch = (ds: Dataset, cases: Case[], meetings: Meeting[] = ds.meetings): Dataset => ({ ...ds, cases, meetings, edited: true });

export function nextCaseId(ds: Dataset): string {
  let max = 0;
  for (const c of ds.cases) {
    const m = c.id.match(/^C-(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `C-${String(max + 1).padStart(4, '0')}`;
}

export interface NewCase {
  direction: Direction;
  regionGroup: RegionGroup;
  city: string;
  ageGroup: string;
  project: string;
  existingClientKey?: string;
}

export function createCase(ds: Dataset, input: NewCase, date = today()): { ds: Dataset; id: string } {
  const id = nextCaseId(ds);
  const c: Case = {
    id,
    clientKey: input.existingClientKey?.trim() || id,
    direction: input.direction,
    specialist: null,
    city: input.city.trim() || (input.regionGroup === 'capitals' ? 'Москва' : 'Регион'),
    regionGroup: input.regionGroup,
    ageGroup: input.ageGroup,
    project: input.project,
    createdAt: date,
    assignedAt: null,
    status: 'queue',
    closedAt: null,
    closeReason: null,
  };
  return { ds: touch(ds, [c, ...ds.cases]), id };
}

function patch(ds: Dataset, id: string, fn: (c: Case) => Case): Dataset {
  return touch(ds, ds.cases.map((c) => (c.id === id ? fn(c) : c)));
}

export function assignCase(ds: Dataset, id: string, specialist: string, date = today()): Dataset {
  return patch(ds, id, (c) =>
    c.status === 'queue' ? { ...c, specialist, assignedAt: date, status: 'in_work' as CaseStatus } : c
  );
}

export function closeCase(ds: Dataset, id: string, reason: string, date = today()): Dataset {
  if (!reason) throw new Error('Причина завершения обязательна.');
  return patch(ds, id, (c) => {
    if (c.status === 'in_work') return { ...c, status: 'done', closedAt: date, closeReason: reason };
    if (c.status === 'queue') return { ...c, status: 'not_started', closedAt: date, closeReason: reason };
    return c;
  });
}

export function setProject(ds: Dataset, id: string, project: string): Dataset {
  return patch(ds, id, (c) => ({ ...c, project }));
}

export function addMeeting(ds: Dataset, id: string, m: Omit<Meeting, 'caseId'>): Dataset {
  const c = ds.cases.find((x) => x.id === id);
  if (!c || c.status !== 'in_work') throw new Error('Встречу можно добавить только в случай «В работе».');
  if (m.hours <= 0) throw new Error('Длительность должна быть больше нуля.');
  return touch(ds, ds.cases, [...ds.meetings, { caseId: id, ...m }]);
}

export function canSee(role: Role, c: Case): boolean {
  return role.kind === 'admin' || c.specialist === role.name;
}
