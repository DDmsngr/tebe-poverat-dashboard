import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addMeeting, assignCase, canSee, closeCase, createCase, nextCaseId } from './crm.ts';
import { periodSummary } from './metrics.ts';
import type { Dataset, Filters } from './types.ts';

const base: Dataset = { source: 'demo', label: 't', warnings: [], cases: [], meetings: [] };
const f: Filters = { from: '2026-11', to: '2026-11', direction: 'all', specialist: 'all', project: 'all', region: 'all' };
const input = { direction: 'detrod' as const, regionGroup: 'regions' as const, city: 'Томск', ageGroup: '13-17', project: 'Абсолют-Помощь' };

test('новое обращение попадает в очередь и в показатели', () => {
  const { ds, id } = createCase(base, input, '2026-11-03');
  assert.equal(id, 'C-0001');
  assert.equal(ds.edited, true);
  const s = periodSummary(ds, f);
  assert.equal(s.requests, 1);
  assert.equal(s.queueEnd, 1);
  assert.equal(s.assigned, 0);
});

test('назначение переводит случай из очереди в работу', () => {
  let { ds, id } = createCase(base, input, '2026-11-03');
  ds = assignCase(ds, id, 'Специалист Д1', '2026-11-10');
  const s = periodSummary(ds, f);
  assert.equal(s.assigned, 1);
  assert.equal(s.queueEnd, 0);
  assert.equal(s.avgWaitDays, 7);
});

test('встреча считается только у случая в работе', () => {
  let { ds, id } = createCase(base, input, '2026-11-03');
  assert.throws(() => addMeeting(ds, id, { date: '2026-11-11', status: 'held', hours: 1 }));
  ds = assignCase(ds, id, 'Специалист Д1', '2026-11-10');
  ds = addMeeting(ds, id, { date: '2026-11-12', status: 'held', hours: 1.5 });
  ds = addMeeting(ds, id, { date: '2026-11-19', status: 'cancel_client', hours: 1 });
  const s = periodSummary(ds, f);
  assert.equal(s.held, 1);
  assert.equal(s.clients, 1);
  assert.equal(s.hours, 1.5);
  assert.equal(s.cancelled, 1);
});

test('завершение требует причину и меняет статус', () => {
  let { ds, id } = createCase(base, input, '2026-11-03');
  ds = assignCase(ds, id, 'Специалист Д1', '2026-11-10');
  assert.throws(() => closeCase(ds, id, ''));
  ds = closeCase(ds, id, 'Курс закончен', '2026-11-25');
  assert.equal(ds.cases[0].status, 'done');
  assert.equal(periodSummary(ds, f).closed, 1);
});

test('отказ из очереди выбывает из очереди', () => {
  let { ds, id } = createCase(base, input, '2026-11-03');
  ds = closeCase(ds, id, 'Не вышел на связь', '2026-11-08');
  assert.equal(ds.cases[0].status, 'not_started');
  assert.equal(periodSummary(ds, f).queueEnd, 0);
  assert.equal(periodSummary(ds, f).notStarted, 1);
});

test('психолог видит только свои случаи, коды идут по порядку', () => {
  let { ds, id } = createCase(base, input, '2026-11-03');
  ds = assignCase(ds, id, 'Специалист Д1', '2026-11-10');
  assert.equal(canSee({ kind: 'specialist', name: 'Специалист Д1' }, ds.cases[0]), true);
  assert.equal(canSee({ kind: 'specialist', name: 'Специалист Д2' }, ds.cases[0]), false);
  assert.equal(canSee({ kind: 'admin' }, ds.cases[0]), true);
  assert.equal(nextCaseId(ds), 'C-0002');
});
