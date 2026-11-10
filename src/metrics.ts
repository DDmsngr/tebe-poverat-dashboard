import type { Case, Dataset, Filters, Meeting } from './types.ts';

export const ymOf = (d: string) => d.slice(0, 7);

export function monthEnd(m: string): string {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
}
export const monthStart = (m: string) => `${m}-01`;

export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

const inRange = (d: string | null, from: string, to: string) => d !== null && d >= from && d <= to;

/** Базовый набор: направление, проект, регион. Специалистка не применяется,
 *  потому что в момент обращения её ещё нет. */
function baseCases(ds: Dataset, f: Filters): Case[] {
  return ds.cases.filter(
    (c) =>
      (f.direction === 'all' || c.direction === f.direction) &&
      (f.project === 'all' || c.project === f.project) &&
      (f.region === 'all' || c.regionGroup === f.region)
  );
}

function bySpecialist(cases: Case[], f: Filters): Case[] {
  return f.specialist === 'all' ? cases : cases.filter((c) => c.specialist === f.specialist);
}

function meetingsOf(ds: Dataset, cases: Case[]): Meeting[] {
  const ids = new Set(cases.map((c) => c.id));
  return ds.meetings.filter((m) => ids.has(m.caseId));
}

export interface Summary {
  requests: number;
  requestsAdult: number;
  requestsDetrod: number;
  assigned: number;
  assignedAdult: number;
  assignedDetrod: number;
  assignedRegional: number;
  queueEnd: number;
  held: number;
  heldDetrod: number;
  heldRegional: number;
  clients: number;
  hours: number;
  cancelled: number;
  avgWaitDays: number | null;
  closed: number;
  notStarted: number;
}

/** Показатели за произвольный отрезок дат [from, to]. */
export function summarize(ds: Dataset, f: Filters, from: string, to: string): Summary {
  const base = baseCases(ds, f);
  const withSpec = bySpecialist(base, f);

  const created = base.filter((c) => inRange(c.createdAt, from, to));
  const assignedCases = withSpec.filter((c) => inRange(c.assignedAt, from, to));

  const queueEnd = base.filter(
    (c) =>
      c.createdAt <= to &&
      (c.assignedAt === null || c.assignedAt > to) &&
      !(c.status === 'not_started' && c.closedAt !== null && c.closedAt <= to)
  ).length;

  const meetings = meetingsOf(ds, withSpec).filter((m) => inRange(m.date, from, to));
  const held = meetings.filter((m) => m.status === 'held');
  const caseById = new Map(ds.cases.map((c) => [c.id, c]));

  const heldCases = held.map((m) => caseById.get(m.caseId)!).filter(Boolean);
  const clients = new Set(heldCases.map((c) => c.clientKey));

  const waits = assignedCases
    .filter((c) => c.assignedAt)
    .map((c) => daysBetween(c.createdAt, c.assignedAt!))
    .filter((d) => d >= 0);

  return {
    requests: created.length,
    requestsAdult: created.filter((c) => c.direction === 'adult').length,
    requestsDetrod: created.filter((c) => c.direction === 'detrod').length,
    assigned: assignedCases.length,
    assignedAdult: assignedCases.filter((c) => c.direction === 'adult').length,
    assignedDetrod: assignedCases.filter((c) => c.direction === 'detrod').length,
    assignedRegional: assignedCases.filter((c) => c.regionGroup === 'regions').length,
    queueEnd,
    held: held.length,
    heldDetrod: heldCases.filter((c) => c.direction === 'detrod').length,
    heldRegional: heldCases.filter((c) => c.regionGroup === 'regions').length,
    clients: clients.size,
    hours: held.reduce((s, m) => s + m.hours, 0),
    cancelled: meetings.filter((m) => m.status !== 'held').length,
    avgWaitDays: waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : null,
    closed: withSpec.filter((c) => c.status === 'done' && inRange(c.closedAt, from, to)).length,
    notStarted: base.filter((c) => c.status === 'not_started' && inRange(c.closedAt, from, to)).length,
  };
}

export interface MonthRow extends Summary {
  month: string;
}

export function monthly(ds: Dataset, f: Filters): MonthRow[] {
  return monthsBetween(f.from, f.to).map((m) => ({
    month: m,
    ...summarize(ds, f, monthStart(m), monthEnd(m)),
  }));
}

export function periodSummary(ds: Dataset, f: Filters): Summary {
  return summarize(ds, f, monthStart(f.from), monthEnd(f.to));
}

export interface SpecialistRow {
  specialist: string;
  inWork: number;
  clients: number;
  held: number;
  hours: number;
  cancelled: number;
}

export function bySpecialistTable(ds: Dataset, f: Filters): SpecialistRow[] {
  const from = monthStart(f.from);
  const to = monthEnd(f.to);
  const base = baseCases(ds, f).filter((c) => c.specialist);
  const names = [...new Set(base.map((c) => c.specialist!))].sort();
  return names.map((name) => {
    const mine = base.filter((c) => c.specialist === name);
    const meetings = meetingsOf(ds, mine).filter((m) => inRange(m.date, from, to));
    const held = meetings.filter((m) => m.status === 'held');
    const caseById = new Map(mine.map((c) => [c.id, c]));
    return {
      specialist: name,
      inWork: mine.filter((c) => c.status === 'in_work').length,
      clients: new Set(held.map((m) => caseById.get(m.caseId)!.clientKey)).size,
      held: held.length,
      hours: held.reduce((s, m) => s + m.hours, 0),
      cancelled: meetings.length - held.length,
    };
  });
}

export function closeReasons(ds: Dataset, f: Filters): { reason: string; count: number }[] {
  const from = monthStart(f.from);
  const to = monthEnd(f.to);
  const cases = bySpecialist(baseCases(ds, f), f).filter(
    (c) => (c.status === 'done' || c.status === 'not_started') && inRange(c.closedAt, from, to)
  );
  const map = new Map<string, number>();
  for (const c of cases) {
    const r = c.closeReason ?? 'Причина не указана';
    map.set(r, (map.get(r) ?? 0) + 1);
  }
  return [...map.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
}

export function facets(ds: Dataset) {
  return {
    specialists: [...new Set(ds.cases.map((c) => c.specialist).filter((s): s is string => !!s))].sort(),
    projects: [...new Set(ds.cases.map((c) => c.project))].sort(),
  };
}

export function dataRange(ds: Dataset): { from: string; to: string } {
  const dates = [
    ...ds.cases.map((c) => c.createdAt),
    ...ds.meetings.map((m) => m.date),
  ].sort();
  return { from: ymOf(dates[0] ?? '2026-01-01'), to: ymOf(dates[dates.length - 1] ?? '2026-12-31') };
}

export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null);
