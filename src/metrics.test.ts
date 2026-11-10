import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthly, periodSummary, closeReasons, monthsBetween, monthEnd } from './metrics.ts';
import type { Dataset, Filters } from './types.ts';

const ds: Dataset = {
  source: 'demo',
  label: 'test',
  warnings: [],
  cases: [
    { id: 'c1', clientKey: 'k1', direction: 'adult', specialist: 'A1', city: 'Томск', regionGroup: 'regions', ageGroup: '35-54', project: 'P1', createdAt: '2026-01-05', assignedAt: '2026-01-20', status: 'in_work', closedAt: null, closeReason: null },
    { id: 'c2', clientKey: 'k2', direction: 'detrod', specialist: 'D1', city: 'Москва', regionGroup: 'capitals', ageGroup: '13-17', project: 'P2', createdAt: '2026-01-10', assignedAt: '2026-02-03', status: 'done', closedAt: '2026-02-28', closeReason: 'Курс закончен' },
    { id: 'c3', clientKey: 'k3', direction: 'adult', specialist: null, city: 'Москва', regionGroup: 'capitals', ageGroup: '18-34', project: 'P1', createdAt: '2026-01-25', assignedAt: null, status: 'queue', closedAt: null, closeReason: null },
    { id: 'c4', clientKey: 'k4', direction: 'detrod', specialist: null, city: 'Уфа', regionGroup: 'regions', ageGroup: 'до 13', project: 'P2', createdAt: '2026-02-02', assignedAt: null, status: 'not_started', closedAt: '2026-02-10', closeReason: 'Не вышел на связь' },
  ],
  meetings: [
    { caseId: 'c1', date: '2026-01-27', status: 'held', hours: 1 },
    { caseId: 'c1', date: '2026-02-03', status: 'held', hours: 1.5 },
    { caseId: 'c1', date: '2026-02-10', status: 'cancel_client', hours: 1 },
    { caseId: 'c2', date: '2026-02-10', status: 'held', hours: 1 },
    { caseId: 'c2', date: '2026-02-17', status: 'held', hours: 1 },
  ],
};

const all: Filters = { from: '2026-01', to: '2026-02', direction: 'all', specialist: 'all', project: 'all', region: 'all' };

test('месяцы и конец месяца', () => {
  assert.deepEqual(monthsBetween('2025-11', '2026-02'), ['2025-11', '2025-12', '2026-01', '2026-02']);
  assert.equal(monthEnd('2026-02'), '2026-02-28');
});

test('январь: обращения, передано, очередь, консультации', () => {
  const jan = monthly(ds, all)[0];
  assert.equal(jan.requests, 3);
  assert.equal(jan.requestsAdult, 2);
  assert.equal(jan.requestsDetrod, 1);
  assert.equal(jan.assigned, 1);
  assert.equal(jan.queueEnd, 2);
  assert.equal(jan.held, 1);
  assert.equal(jan.clients, 1);
  assert.equal(jan.hours, 1);
  assert.equal(jan.avgWaitDays, 15);
});

test('февраль: очередь без отказавшихся, ожидание и завершения', () => {
  const feb = monthly(ds, all)[1];
  assert.equal(feb.requests, 1);
  assert.equal(feb.assigned, 1);
  assert.equal(feb.assignedDetrod, 1);
  assert.equal(feb.queueEnd, 1);
  assert.equal(feb.held, 3);
  assert.equal(feb.heldDetrod, 2);
  assert.equal(feb.heldRegional, 1);
  assert.equal(feb.clients, 2);
  assert.equal(feb.hours, 3.5);
  assert.equal(feb.cancelled, 1);
  assert.equal(feb.avgWaitDays, 24);
  assert.equal(feb.closed, 1);
  assert.equal(feb.notStarted, 1);
});

test('уникальные клиенты за период считаются один раз', () => {
  const total = periodSummary(ds, all);
  assert.equal(total.held, 4);
  assert.equal(total.clients, 2);
});

test('фильтр специалиста не меняет обращения и очередь', () => {
  const f: Filters = { ...all, specialist: 'A1' };
  const feb = monthly(ds, f)[1];
  assert.equal(feb.requests, 1);
  assert.equal(feb.queueEnd, 1);
  assert.equal(feb.assigned, 0);
  assert.equal(feb.held, 1);
});

test('фильтр региона и проекта', () => {
  const regions = periodSummary(ds, { ...all, region: 'regions' });
  assert.equal(regions.requests, 2);
  assert.equal(regions.held, 2);
  const p2 = periodSummary(ds, { ...all, project: 'P2' });
  assert.equal(p2.clients, 1);
});

test('причины завершения', () => {
  const r = closeReasons(ds, all);
  assert.deepEqual(r.map((x) => x.reason).sort(), ['Курс закончен', 'Не вышел на связь']);
});
