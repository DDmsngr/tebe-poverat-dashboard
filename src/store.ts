import type { Dataset } from './types.ts';
import { makeDemo } from './demo.ts';

const KEY = 'tp-dashboard-dataset-v1';

/** Данные хранятся только в браузере этого компьютера и никуда не отправляются. */
export function loadDataset(): Dataset {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Dataset;
  } catch {
    /* повреждённые данные игнорируем */
  }
  return makeDemo();
}

export function saveDataset(ds: Dataset) {
  try {
    if (ds.source === 'demo') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(ds));
  } catch {
    /* переполнение хранилища: работаем без сохранения */
  }
}
