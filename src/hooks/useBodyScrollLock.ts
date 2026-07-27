import { useEffect } from "react";

/**
 * 전체 화면 오버레이가 떠 있는 동안 뒤 화면 스크롤을 잠근다
 * (스크롤바가 둘로 보이는 것 방지). 언마운트 시 이전 값으로 복원.
 */
export function useBodyScrollLock() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
}
