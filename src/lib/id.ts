/**
 * 레코드 id 발급. `crypto.randomUUID`가 없는 환경(구형 브라우저)에서는 시각+난수로 대체한다.
 * 순수 함수가 아니므로(난수) 상태 전이 함수들은 id를 인자로 받고, 호출부에서 이것을 넣어 준다.
 */
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
