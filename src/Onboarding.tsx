import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui.tsx';

const KEY = 'tp-onboarding-v2';

export function onboardingSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* без сохранения подсказка просто покажется снова */
  }
}

interface Step {
  /** Значение data-tour у подсвечиваемого элемента. Без него шаг показывается по центру. */
  target?: string;
  title: string;
  text: string;
  points?: string[];
}

const STEPS: Step[] = [
  {
    title: 'Одно окно вместо таблиц',
    text: 'Здесь вся повседневная работа: принять обращение, назначить психолога, отметить встречу, завершить работу и посмотреть цифры. Писать почти ничего не нужно, всё выбирается из списков. Сейчас покажу, где что нажимать.',
    points: ['Это прототип: данные вымышлены, личных данных клиентов в нём нет.'],
  },
  {
    target: 'role',
    title: 'Выберите, кто вы',
    text: 'Переключатель роли. Администратор видит всё и распределяет заявки. Психолог видит только свои случаи и свои цифры. Попробуйте обе роли.',
  },
  {
    target: 'tabs',
    title: 'Разделы',
    text: 'Случаи это рабочая страница. Обзор показывает цифры, Специалисты нагрузку, Данные нужны для старой таблицы и отчёта, Как считаем объясняет определения.',
  },
  {
    target: 'new-case',
    title: 'Принять обращение',
    text: 'Нажмите, и откроется короткая форма: направление, возрастная группа, регион, проект. Всё выбирается из списков. Имя и контакты клиента остаются в CRM.',
  },
  {
    target: 'case-filters',
    title: 'Очередь и поиск',
    text: 'По умолчанию показана очередь: кто ждёт дольше всех, тот выше. Здесь можно выбрать другой статус, направление или найти случай по коду.',
  },
  {
    target: 'case-row',
    title: 'Откройте случай',
    text: 'Нажмите на любую строку, откроется карточка. В ней три действия, и каждое делается выбором из списка:',
    points: ['Назначить специалиста: случай уходит из очереди в работу.', 'Записать встречу: дата, итог, один или полтора часа.', 'Завершить работу: причина из списка, свободный комментарий не нужен.'],
  },
  {
    target: 'tab-overview',
    title: 'Цифры для отчёта',
    text: 'Обращения, передано, очередь, консультации, клиенты, ожидание. Можно выбрать период и отфильтровать по направлению, специалисту, проекту и региону.',
  },
  {
    target: 'tab-data',
    title: 'Отчёт и старая таблица',
    text: 'Здесь скачивается отчёт для грантодателя в Excel и загружается старая таблица «Консультации», чтобы история и новые данные шли одним рядом.',
  },
  {
    target: 'tour-btn',
    title: 'Подсказка всегда под рукой',
    text: 'Эту экскурсию можно запустить снова кнопкой «Как пользоваться». Можно начинать работу.',
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;
const CARD_W = 360;

function findTarget(name?: string): HTMLElement | null {
  return name ? document.querySelector<HTMLElement>(`[data-tour="${name}"]`) : null;
}

export default function Onboarding({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardH, setCardH] = useState(220);
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const cardRef = useRef<HTMLDivElement>(null);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  const finish = () => {
    markSeen();
    onClose();
  };

  // Наводим на цель: прокрутка к элементу и замер его положения.
  useLayoutEffect(() => {
    const el = findTarget(step.target);
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    const measure = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      setVp({ w: window.innerWidth, h: window.innerHeight });
    };
    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [i, step.target]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
  }, [i, rect]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, STEPS.length - 1));
      if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mobile = vp.w < 640;
  const spot = rect ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 } : null;

  // Положение подсказки: под целью, а если не помещается, то над ней.
  let cardStyle: React.CSSProperties;
  if (!spot) {
    cardStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: Math.min(CARD_W + 60, vp.w - 24) };
  } else if (mobile) {
    cardStyle = { left: 12, right: 12, bottom: 12 };
  } else {
    const gap = 16;
    const below = spot.top + spot.height + gap;
    const top = below + cardH <= vp.h - 12 ? below : Math.max(12, spot.top - gap - cardH);
    const left = Math.min(Math.max(12, spot.left + spot.width / 2 - CARD_W / 2), vp.w - CARD_W - 12);
    cardStyle = { top, left, width: CARD_W };
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Как пользоваться">
      {/* Перехватывает клики, чтобы под подсказкой ничего не нажималось */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
      {spot ? (
        <div
          className="tour-spot pointer-events-none absolute rounded-2xl transition-all duration-300"
          style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-night/70" />
      )}

      <div ref={cardRef} className="absolute rounded-[24px] bg-cream p-5 shadow-2xl" style={cardStyle}>
        <button onClick={finish} aria-label="Закрыть подсказку" className="absolute right-3 top-3 rounded-full p-1.5 text-ink/55 hover:bg-white">
          <X size={18} />
        </button>
        <div className="text-xs font-medium uppercase tracking-widest text-brand">
          Шаг {i + 1} из {STEPS.length}
        </div>
        <h2 className="mt-1 pr-6 text-xl font-semibold text-night">{step.title}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink/80">{step.text}</p>
        {step.points && (
          <ul className="mt-2 space-y-1.5 text-sm text-ink/75">
            {step.points.map((p) => (
              <li key={p} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose" />
                {p}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((_, k) => (
              <span key={k} className={`h-2 rounded-full transition-all ${k === i ? 'w-5 bg-brand' : 'w-2 bg-brand/25'}`} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {i > 0 ? (
              <Button variant="ghost" onClick={() => setI(i - 1)}>
                Назад
              </Button>
            ) : (
              <button onClick={finish} className="px-3 text-sm text-ink/55 hover:text-ink">
                Пропустить
              </button>
            )}
            <Button onClick={last ? finish : () => setI(i + 1)}>{last ? 'Начать работу' : 'Дальше'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
