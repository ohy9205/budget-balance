import { useEffect, type RefObject } from "react";

/**
 * 마운트 직후 입력에 포커스를 주고 커서를 끝으로 옮긴다.
 * 오버레이가 열리며 스스로 포커스를 가져가므로, 한 프레임 뒤에 되돌려야 한다.
 */
export function useAutoFocus(ref: RefObject<HTMLInputElement>) {
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const input = ref.current;
      if (!input) return;
      input.focus();
      const end = input.value.length;
      input.setSelectionRange(end, end);
    });
    return () => cancelAnimationFrame(id);
  }, [ref]);
}
