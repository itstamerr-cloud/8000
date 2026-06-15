import type { AttemptStatus } from "./types";

export const DAILY_TARGET = 70;
export const PER_EMPLOYEE = 5;

export const STATUS_LABELS: Record<AttemptStatus, string> = {
  pending: "بانتظار التنفيذ",
  no_answer: "ما تم الوصول",
  interested: "تم — مهتم",
  not_interested: "تم — غير مهتم",
  callback: "تم — طلب متابعة",
};

export const STATUS_OPTIONS: { value: AttemptStatus; label: string }[] = (
  Object.keys(STATUS_LABELS) as AttemptStatus[]
).map((value) => ({ value, label: STATUS_LABELS[value] }));

export const STATUS_STYLES: Record<AttemptStatus, string> = {
  pending: "bg-slate-100 text-slate-700 border-slate-200",
  no_answer: "bg-amber-100 text-amber-800 border-amber-200",
  interested: "bg-emerald-100 text-emerald-800 border-emerald-200",
  not_interested: "bg-rose-100 text-rose-800 border-rose-200",
  callback: "bg-sky-100 text-sky-800 border-sky-200",
};
