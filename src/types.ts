export type Direction = 'adult' | 'detrod';
export type RegionGroup = 'capitals' | 'regions';
export type CaseStatus = 'queue' | 'in_work' | 'done' | 'not_started';
export type MeetingStatus = 'held' | 'cancel_client' | 'cancel_spec' | 'no_show';

/** Случай: один клиент у одной специалистки (в CRM это сделка). */
export interface Case {
  id: string;
  clientKey: string;
  direction: Direction;
  specialist: string | null;
  city: string;
  regionGroup: RegionGroup;
  ageGroup: string;
  project: string;
  createdAt: string; // YYYY-MM-DD
  assignedAt: string | null;
  status: CaseStatus;
  closedAt: string | null;
  closeReason: string | null;
}

/** Встреча: одна запись журнала, аналог «1» в ячейке дня. */
export interface Meeting {
  caseId: string;
  date: string;
  status: MeetingStatus;
  hours: number;
}

export interface Dataset {
  source: 'demo' | 'excel' | 'crm';
  label: string;
  cases: Case[];
  meetings: Meeting[];
  warnings: string[];
}

export interface Filters {
  from: string; // YYYY-MM
  to: string;
  direction: 'all' | Direction;
  specialist: 'all' | string;
  project: 'all' | string;
  region: 'all' | RegionGroup;
}

export const DIRECTION_LABEL: Record<Direction, string> = { adult: 'Взрослое', detrod: 'Детско-родительское' };
export const REGION_LABEL: Record<RegionGroup, string> = { capitals: 'Москва и Санкт-Петербург', regions: 'Регионы' };
export const STATUS_LABEL: Record<CaseStatus, string> = {
  queue: 'В очереди',
  in_work: 'В работе',
  done: 'Завершено',
  not_started: 'Не начали',
};
