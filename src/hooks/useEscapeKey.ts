import { useEffect, useRef } from "react";

/**
 * Esc 키로 닫기. TDS 오버레이가 해 주지 않는 부분을 직접 처리한다.
 * `enabled`가 false면 리스너를 붙이지 않는다 — 확인 다이얼로그처럼
 * 더 위에 뜬 오버레이에 Esc를 양보할 때 쓴다.
 */
export function useEscapeKey(handler: () => void, enabled = true) {
  // 매 렌더 새로 만들어지는 handler 때문에 리스너를 다시 붙이지 않도록 ref로 받는다.
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handlerRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled]);
}
