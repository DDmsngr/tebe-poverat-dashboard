import { useState } from 'react';
import { BarChart3, ClipboardList, ListChecks, UserCog, Sparkles, X } from 'lucide-react';
import type { ComponentType } from 'react';
import { Button } from './ui.tsx';

const KEY = 'tp-onboarding-v1';

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
  icon: ComponentType<{ size?: number }>;
  title: string;
  text: string[];
  hint?: string;
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: 'Одно окно вместо таблиц',
    text: [
      'Здесь собрана вся повседневная работа: принять обращение, назначить психолога, отметить встречу, завершить работу и посмотреть цифры.',
      'Писать почти ничего не нужно: всё выбирается из списков.',
    ],
    hint: 'Это прототип. Данные вымышлены, личных данных клиентов в нём нет.',
  },
  {
    icon: UserCog,
    title: 'Выберите, кто вы',
    text: [
      'Вверху справа переключатель «Вы вошли как». Администратор видит всё и распределяет заявки. Психолог видит только свои случаи и свои цифры.',
      'Попробуйте оба варианта: так видно, как работает каждый.',
    ],
  },
  {
    icon: ClipboardList,
    title: 'Случаи: рабочая страница',
    text: [
      'Администратору сразу показана очередь: кто ждёт дольше всех, тот выше. Новое обращение создаётся большой кнопкой наверху.',
      'Нажмите на любую строку, чтобы открыть карточку случая.',
    ],
  },
  {
    icon: ListChecks,
    title: 'В карточке три действия',
    text: [
      'Назначить специалиста: случай уходит из очереди в работу.',
      'Записать встречу: дата, итог и один или полтора часа. Одно действие на встречу.',
      'Завершить работу: выберите причину из списка. Свободный комментарий о клиенте не нужен.',
    ],
  },
  {
    icon: BarChart3,
    title: 'Обзор: цифры для отчёта',
    text: [
      'На вкладке «Обзор» те же показатели, что вы сейчас считаете вручную: обращения, передано, очередь, консультации, клиенты.',
      'Выберите период и фильтры, а отчёт для грантодателя скачайте в Excel на вкладке «Данные».',
    ],
    hint: 'Вернуться к подсказке можно кнопкой «Как пользоваться» в шапке.',
  },
];

export default function Onboarding({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  const Icon = step.icon;

  const finish = () => {
    markSeen();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-night/60 p-4" role="dialog" aria-modal="true" aria-label="Как пользоваться">
      <div className="relative w-full max-w-lg rounded-[28px] bg-cream p-7 shadow-2xl">
        <button onClick={finish} aria-label="Закрыть подсказку" className="absolute right-4 top-4 rounded-full p-1.5 text-ink/55 hover:bg-white">
          <X size={20} />
        </button>

        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white">
          <Icon size={28} />
        </div>
        <div className="text-xs font-medium uppercase tracking-widest text-brand">
          Шаг {i + 1} из {STEPS.length}
        </div>
        <h2 className="mt-1 text-2xl font-semibold text-night">{step.title}</h2>
        <div className="mt-3 space-y-2 text-[15px] leading-relaxed text-ink/80">
          {step.text.map((t, k) => (
            <p key={k}>{t}</p>
          ))}
        </div>
        {step.hint && <p className="mt-4 rounded-2xl bg-white p-3 text-xs text-ink/60">{step.hint}</p>}

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((_, k) => (
              <span key={k} className={`h-2 rounded-full transition-all ${k === i ? 'w-6 bg-brand' : 'w-2 bg-brand/25'}`} />
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
