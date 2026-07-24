/** 금액·날짜 표시 포맷 유틸. */

/** 정수 원 → "1,234원" (음수 지원: "-1,234원") */
export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount);
  return `${rounded.toLocaleString("ko-KR")}원`;
}

/** 사용률(%)을 소수 1자리 이하로 정리해서 "82%" / "82.5%" 형태로 */
export function formatPercent(pct: number): string {
  const rounded = Math.round(pct * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
}

/** "YYYY-MM-DD" → "M월 D일" */
export function formatDateLabel(dateKey: string): string {
  const parts = dateKey.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateKey;
  return `${parts[1]}월 ${parts[2]}일`;
}
