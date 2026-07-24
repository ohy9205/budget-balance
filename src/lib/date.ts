/** 날짜 관련 순수 유틸. 모든 "월"은 "YYYY-MM", 날짜는 "YYYY-MM-DD" 형식. */

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Date → "YYYY-MM" */
export function getMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

/** Date → "YYYY-MM-DD" (로컬 기준) */
export function getDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** "YYYY-MM" 유효성 검사 */
export function isValidMonthKey(month: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

/** "YYYY-MM"을 { year, month(1-12) }로 분해 */
export function parseMonthKey(month: string): { year: number; month: number } {
  const [y, m] = month.split("-").map(Number);
  return { year: y, month: m };
}

/** 해당 월의 전체 일수 */
export function daysInMonth(month: string): number {
  const { year, month: m } = parseMonthKey(month);
  return new Date(year, m, 0).getDate();
}

/** 월 이동: "YYYY-MM" + delta개월 → "YYYY-MM" */
export function addMonth(month: string, delta: number): string {
  const { year, month: m } = parseMonthKey(month);
  const d = new Date(year, m - 1 + delta, 1);
  return getMonthKey(d);
}

/** "YYYY-MM" → "YYYY년 M월" */
export function formatMonthLabel(month: string): string {
  const { year, month: m } = parseMonthKey(month);
  return `${year}년 ${m}월`;
}

/**
 * 월 진행률(0~1). today가 해당 월 안에 있으면 오늘 일자 ÷ 총 일수,
 * 과거 월이면 1, 미래 월이면 0.
 */
export function monthProgress(month: string, today: Date = new Date()): number {
  const todayMonth = getMonthKey(today);
  if (month < todayMonth) return 1;
  if (month > todayMonth) return 0;
  return today.getDate() / daysInMonth(month);
}

/** month가 today가 속한 현재 월인지 여부 */
export function isCurrentMonth(month: string, today: Date = new Date()): boolean {
  return month === getMonthKey(today);
}
