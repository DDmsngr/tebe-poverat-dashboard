import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Case, CaseStatus, Dataset, Direction, MeetingStatus, RegionGroup } from './types.ts';
import { DIRECTION_LABEL, REGION_LABEL, STATUS_LABEL } from './types.ts';
import {
  AGE_GROUPS, CLOSE_REASONS, MEETING_LABEL, NOT_STARTED_REASONS, addMeeting, assignCase, canSee,
  closeCase, createCase, setProject, today, type Role,
} from './crm.ts';
import { facets } from './metrics.ts';
import { Button, Card, Select } from './ui.tsx';

interface Props {
  ds: Dataset;
  role: Role;
  onChange: (next: Dataset) => void;
}

const CHIP: Record<CaseStatus, string> = {
  queue: 'bg-[#fbeedd] text-[#8a5a14]',
  in_work: 'bg-sky text-brand-dark',
  done: 'bg-[#dcebe9] text-teal',
  not_started: 'bg-blush text-[#8d3f50]',
};

const Chip = ({ s }: { s: CaseStatus }) => (
  <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-medium ${CHIP[s]}`}>{STATUS_LABEL[s]}</span>
);

const field = 'rounded-full border border-brand/25 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';

export default function Cases({ ds, role, onChange }: Props) {
  const [status, setStatus] = useState<'all' | CaseStatus>(role.kind === 'admin' ? 'queue' : 'in_work');
  const [direction, setDirection] = useState<'all' | Direction>('all');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(40);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const lastMeeting = useMemo(() => {
    const m = new Map<string, { date: string; held: number }>();
    for (const x of ds.meetings) {
      const cur = m.get(x.caseId) ?? { date: '', held: 0 };
      if (x.date > cur.date) cur.date = x.date;
      if (x.status === 'held') cur.held += 1;
      m.set(x.caseId, cur);
    }
    return m;
  }, [ds.meetings]);

  const mine = useMemo(() => ds.cases.filter((c) => canSee(role, c)), [ds.cases, role]);
  const counts = useMemo(() => {
    const r: Record<string, number> = { all: mine.length };
    for (const c of mine) r[c.status] = (r[c.status] ?? 0) + 1;
    return r;
  }, [mine]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mine
      .filter((c) => (status === 'all' || c.status === status) && (direction === 'all' || c.direction === direction))
      .filter((c) => !q || c.id.toLowerCase().includes(q) || c.clientKey.toLowerCase().includes(q))
      .sort((a, b) => (status === 'queue' ? (a.createdAt < b.createdAt ? -1 : 1) : a.createdAt < b.createdAt ? 1 : -1));
  }, [mine, status, direction, query]);

  const open = openId ? ds.cases.find((c) => c.id === openId) : undefined;

  return (
    <div className="space-y-5">
      <div className="flex justify-center py-1">
        {role.kind === 'admin' ? (
          <Button size="lg" onClick={() => setCreating(true)}>
            <Plus size={20} /> Новое обращение
          </Button>
        ) : (
          <p className="rounded-full bg-white px-5 py-2.5 text-sm text-ink/65">Здесь только ваши случаи. Откройте случай, чтобы отметить встречу.</p>
        )}
      </div>
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Статус"
            value={status}
            onChange={(v) => {
              setStatus(v);
              setLimit(40);
            }}
            options={[
              { value: 'all', label: `Все (${counts.all ?? 0})` },
              ...(['queue', 'in_work', 'done', 'not_started'] as const).map((s) => ({ value: s, label: `${STATUS_LABEL[s]} (${counts[s] ?? 0})` })),
            ]}
          />
          <Select
            label="Направление"
            value={direction}
            onChange={setDirection}
            options={[{ value: 'all', label: 'Все' }, ...(['adult', 'detrod'] as const).map((d) => ({ value: d, label: DIRECTION_LABEL[d] }))]}
          />
          <label className="flex flex-col gap-1 text-xs font-medium text-ink/60">
            Код случая или клиента
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="C-0123" className={field} />
          </label>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="num w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs text-ink/60">
                <th className="py-2 pr-3 font-medium">Код</th>
                <th className="px-2 font-medium">Статус</th>
                <th className="px-2 font-medium">Направление</th>
                <th className="px-2 font-medium">Регион</th>
                <th className="px-2 font-medium">Проект</th>
                <th className="px-2 font-medium">Специалист</th>
                <th className="px-2 font-medium">Обращение</th>
                <th className="px-2 text-right font-medium">Встреч</th>
                <th className="px-2 font-medium">Последняя</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((c) => {
                const lm = lastMeeting.get(c.id);
                return (
                  <tr key={c.id} onClick={() => setOpenId(c.id)} className="cursor-pointer border-b border-ink/5 hover:bg-sky/50">
                    <td className="py-2 pr-3 font-medium text-brand-dark">{c.id}</td>
                    <td className="px-2"><Chip s={c.status} /></td>
                    <td className="px-2">{DIRECTION_LABEL[c.direction]}</td>
                    <td className="px-2">{REGION_LABEL[c.regionGroup]}</td>
                    <td className="px-2">{c.project}</td>
                    <td className="px-2">{c.specialist ?? '—'}</td>
                    <td className="px-2">{c.createdAt}</td>
                    <td className="px-2 text-right">{lm?.held ?? 0}</td>
                    <td className="px-2">{lm?.date ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="py-6 text-center text-sm text-ink/60">Случаев с такими условиями нет.</p>}
        {rows.length > limit && (
          <div className="mt-4 text-center">
            <Button variant="ghost" onClick={() => setLimit((l) => l + 40)}>
              Показать ещё ({rows.length - limit})
            </Button>
          </div>
        )}
      </Card>

      {creating && (
        <NewCase
          ds={ds}
          onClose={() => setCreating(false)}
          onCreate={(next, id) => {
            onChange(next);
            setCreating(false);
            setStatus('queue');
            setOpenId(id);
          }}
        />
      )}
      {open && <CaseCard ds={ds} c={open} role={role} onChange={onChange} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-night/50 p-4 sm:p-8" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-[24px] bg-cream p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold text-night">{title}</h2>
          <button onClick={onClose} aria-label="Закрыть" className="rounded-full p-1.5 text-ink/60 hover:bg-white">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function NewCase({ ds, onCreate, onClose }: { ds: Dataset; onCreate: (ds: Dataset, id: string) => void; onClose: () => void }) {
  const projects = useMemo(() => [...new Set([...facets(ds).projects, 'Без проекта'])], [ds]);
  const [direction, setDirection] = useState<Direction>('adult');
  const [region, setRegion] = useState<RegionGroup>('capitals');
  const [city, setCity] = useState('');
  const [age, setAge] = useState('не указан');
  const [project, setProject] = useState(projects[0]);
  const [repeat, setRepeat] = useState('');

  return (
    <Modal title="Новое обращение" onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Направление" value={direction} onChange={(v) => { setDirection(v); setAge('не указан'); }} options={(['adult', 'detrod'] as const).map((d) => ({ value: d, label: DIRECTION_LABEL[d] }))} />
        <Select label="Возрастная группа" value={age} onChange={setAge} options={AGE_GROUPS[direction].map((a) => ({ value: a, label: a }))} />
        <Select label="Регион клиента" value={region} onChange={setRegion} options={(['capitals', 'regions'] as const).map((r) => ({ value: r, label: REGION_LABEL[r] }))} />
        <label className="flex flex-col gap-1 text-xs font-medium text-ink/60">
          Город
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Например, Томск" className={field} />
        </label>
        <Select label="Проект" value={project} onChange={setProject} options={projects.map((p) => ({ value: p, label: p }))} />
        <label className="flex flex-col gap-1 text-xs font-medium text-ink/60">
          Код клиента (если обращается повторно)
          <input value={repeat} onChange={(e) => setRepeat(e.target.value)} placeholder="K-0123" className={field} />
        </label>
      </div>
      <p className="mt-4 rounded-2xl bg-white p-3 text-xs text-ink/65">
        В рабочей версии здесь же вводятся имя и контакты клиента, они уходят прямо в карточку контакта Битрикс24 и в панели не хранятся. В прототипе вводить
        личные данные не нужно.
      </p>
      <div className="mt-5 flex gap-3">
        <Button
          onClick={() => {
            const r = createCase(ds, { direction, regionGroup: region, city, ageGroup: age, project, existingClientKey: repeat });
            onCreate(r.ds, r.id);
          }}
        >
          Создать
        </Button>
        <Button variant="ghost" onClick={onClose}>Отмена</Button>
      </div>
    </Modal>
  );
}

function CaseCard({ ds, c, role, onChange, onClose }: { ds: Dataset; c: Case; role: Role; onChange: (d: Dataset) => void; onClose: () => void }) {
  const admin = role.kind === 'admin';
  const specialists = useMemo(() => {
    const all = facets(ds).specialists;
    const same = all.filter((s) => ds.cases.some((x) => x.specialist === s && x.direction === c.direction));
    return same.length ? same : all;
  }, [ds, c.direction]);
  const projects = useMemo(() => [...new Set([...facets(ds).projects, 'Без проекта'])], [ds]);

  const [spec, setSpec] = useState(specialists[0] ?? '');
  const [reason, setReason] = useState('');
  const [mDate, setMDate] = useState(today());
  const [mStatus, setMStatus] = useState<MeetingStatus>('held');
  const [mHours, setMHours] = useState('1');
  const [error, setError] = useState<string | null>(null);

  const meetings = ds.meetings.filter((m) => m.caseId === c.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const run = (fn: () => Dataset) => {
    try {
      setError(null);
      onChange(fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить.');
    }
  };
  const reasons = c.status === 'queue' ? NOT_STARTED_REASONS : CLOSE_REASONS;

  return (
    <Modal title={`Случай ${c.id}`} onClose={onClose}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Chip s={c.status} />
        <span className="text-sm text-ink/65">
          {DIRECTION_LABEL[c.direction]}, {c.city}, возрастная группа: {c.ageGroup}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-2xl bg-white p-4 text-sm">
        <dt className="text-ink/60">Клиент (код)</dt><dd className="num">{c.clientKey}</dd>
        <dt className="text-ink/60">Специалист</dt><dd>{c.specialist ?? 'не назначен'}</dd>
        <dt className="text-ink/60">Обращение</dt><dd className="num">{c.createdAt}</dd>
        <dt className="text-ink/60">Назначен</dt><dd className="num">{c.assignedAt ?? '—'}</dd>
        {c.closedAt && (<><dt className="text-ink/60">Завершён</dt><dd className="num">{c.closedAt}</dd></>)}
        {c.closeReason && (<><dt className="text-ink/60">Причина</dt><dd>{c.closeReason}</dd></>)}
        <dt className="self-center text-ink/60">Проект</dt>
        <dd>
          <select value={c.project} onChange={(e) => run(() => setProject(ds, c.id, e.target.value))} className={field}>
            {projects.map((p) => <option key={p}>{p}</option>)}
          </select>
        </dd>
      </dl>

      {c.status === 'queue' && admin && (
        <section className="mt-4 rounded-2xl bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-night">Назначить специалиста</h3>
          <div className="flex flex-wrap items-center gap-3">
            <select value={spec} onChange={(e) => setSpec(e.target.value)} className={field}>
              {specialists.map((s) => <option key={s}>{s}</option>)}
            </select>
            <Button onClick={() => run(() => assignCase(ds, c.id, spec))} disabled={!spec}>Назначить</Button>
          </div>
          <p className="mt-2 text-xs text-ink/55">После назначения случай считается «переданным в работу», специалист получает письмо.</p>
        </section>
      )}

      {c.status === 'in_work' && (
        <section className="mt-4 rounded-2xl bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-night">Отметить встречу</h3>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-ink/60">Дата
              <input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} className={field} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-ink/60">Итог
              <select value={mStatus} onChange={(e) => setMStatus(e.target.value as MeetingStatus)} className={field}>
                {(Object.keys(MEETING_LABEL) as MeetingStatus[]).map((k) => <option key={k} value={k}>{MEETING_LABEL[k]}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-ink/60">Часов
              <select value={mHours} onChange={(e) => setMHours(e.target.value)} className={field}>
                <option value="1">1</option><option value="1.5">1,5</option>
              </select>
            </label>
            <Button onClick={() => run(() => addMeeting(ds, c.id, { date: mDate, status: mStatus, hours: Number(mHours) }))}>Записать</Button>
          </div>
        </section>
      )}

      {(c.status === 'in_work' || (c.status === 'queue' && admin)) && (
        <section className="mt-4 rounded-2xl bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-night">{c.status === 'queue' ? 'Не начали работу' : 'Завершить работу'}</h3>
          <div className="flex flex-wrap items-center gap-3">
            <select value={reason} onChange={(e) => setReason(e.target.value)} className={field}>
              <option value="">Причина…</option>
              {reasons.map((r) => <option key={r}>{r}</option>)}
            </select>
            <Button variant="ghost" onClick={() => run(() => closeCase(ds, c.id, reason))}>
              {c.status === 'queue' ? 'Снять с очереди' : 'Завершить'}
            </Button>
          </div>
          <p className="mt-2 text-xs text-ink/55">Причина обязательна. Свободный комментарий о клиенте не нужен.</p>
        </section>
      )}

      {error && <p className="mt-3 rounded-2xl bg-blush p-3 text-sm text-night">{error}</p>}

      <section className="mt-4">
        <h3 className="mb-2 text-sm font-semibold text-night">Встречи ({meetings.length})</h3>
        {meetings.length === 0 ? (
          <p className="text-sm text-ink/60">Пока нет записей.</p>
        ) : (
          <ul className="num max-h-48 space-y-1 overflow-y-auto text-sm">
            {meetings.map((m, i) => (
              <li key={i} className="flex justify-between rounded-xl bg-white px-3 py-1.5">
                <span>{m.date}</span>
                <span className={m.status === 'held' ? '' : 'text-ink/55'}>{MEETING_LABEL[m.status]}</span>
                <span className="text-ink/60">{m.hours} ч</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Modal>
  );
}
