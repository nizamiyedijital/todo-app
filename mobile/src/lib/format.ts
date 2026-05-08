/**
 * Tarih/saat/hafta format helpers — appSettings.dateFormat / timeFormat /
 * weekStart'e duyarlı. Web index.html:11952 fmtShort() / 12000 fmtTime()
 * parity (web tutarsızlıklarını mobile'da düzeltiyoruz; tüm chip'ler buradan
 * geçer).
 */
import { getAppSettings, DateFormat, TimeFormat, WeekStart } from './appSettings';

function pad2(n: number): string { return n < 10 ? `0${n}` : String(n); }

export function formatDate(input: Date | string | number | null | undefined): string {
  if (!input) return '';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  const fmt: DateFormat = getAppSettings().dateFormat;
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yy = String(d.getFullYear());
  switch (fmt) {
    case 'MM/DD':      return `${mm}/${dd}/${yy}`;
    case 'YYYY-MM-DD': return `${yy}-${mm}-${dd}`;
    case 'DD/MM':
    default:           return `${dd}/${mm}/${yy}`;
  }
}

export function formatTime(input: Date | string | number | null | undefined): string {
  if (!input) return '';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  const fmt: TimeFormat = getAppSettings().timeFormat;
  if (fmt === '12h') {
    let h = d.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    return `${h}:${pad2(d.getMinutes())} ${ampm}`;
  }
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatDateTime(input: Date | string | number | null | undefined): string {
  if (!input) return '';
  return `${formatDate(input)} ${formatTime(input)}`.trim();
}

/**
 * Kısa ay adı (TR). "1 May" gibi.
 */
const TR_MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export function formatDateShort(input: Date | string | number | null | undefined): string {
  if (!input) return '';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${TR_MONTHS_SHORT[d.getMonth()]}`;
}

/**
 * appSettings.weekStart'a göre 7 günlük takvim sıralaması.
 * Pazartesi başlangıç: [Pzt, Sal, Çar, Per, Cum, Cmt, Paz]
 * Pazar başlangıç:    [Paz, Pzt, Sal, Çar, Per, Cum, Cmt]
 */
export function getWeekdayOrder(): number[] {
  const ws: WeekStart = getAppSettings().weekStart;
  return ws === 'sunday' ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 0];
}

/**
 * Bir tarihin haftanın başlangıcını döndürür (00:00:00). weekStart'a saygı.
 */
export function startOfWeek(input: Date | number = Date.now()): Date {
  const d = new Date(input);
  d.setHours(0, 0, 0, 0);
  const wd = d.getDay();           // 0=Paz ... 6=Cmt
  const ws = getAppSettings().weekStart;
  const offset = ws === 'sunday' ? wd : (wd === 0 ? 6 : wd - 1);
  d.setDate(d.getDate() - offset);
  return d;
}

const TR_WEEKDAYS_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export function weekdayShort(d: Date | number): string {
  const dd = d instanceof Date ? d : new Date(d);
  return TR_WEEKDAYS_SHORT[dd.getDay()];
}
