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

/** 금액 입력 최대 자릿수 */
const MAX_AMOUNT_DIGITS = 9;

/** 금액 입력용 정규화 — 숫자만 남기고 앞자리 0과 자릿수 초과분을 정리한다. */
export function toAmountDigits(raw: string): string {
  return raw
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "")
    .slice(0, MAX_AMOUNT_DIGITS);
}

/** 숫자 문자열·숫자 → "1,234" (빈 문자열은 그대로 빈 문자열) */
export function formatThousands(value: string | number): string {
  const digits = typeof value === "number" ? String(value) : value;
  if (digits === "") return "";
  return Number(digits).toLocaleString("ko-KR");
}

/** "YYYY-MM-DD" → "M월 D일" */
export function formatDateLabel(dateKey: string): string {
  const parts = dateKey.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateKey;
  return `${parts[1]}월 ${parts[2]}일`;
}
