import { useRef, useState } from "react";

/**
 * 닫힘 애니메이션이 끝난 뒤(`onExited`) 호출부에 알리는 흐름.
 * `BottomSheet`는 애니메이션이 끝나야 `onExited`를 부르므로, 시트를 닫고 이어서
 * 할 일(예: 삭제 확인 다이얼로그 열기)은 그 뒤로 미뤄야 두 오버레이가 겹치지 않는다.
 */
export function useDeferredClose(onClose: () => void) {
  const [open, setOpen] = useState(true);
  const afterExitRef = useRef<(() => void) | null>(null);

  /** 그냥 닫는다 */
  const close = () => setOpen(false);

  /** 닫은 뒤 `after`를 실행한다 (닫힘 애니메이션 종료 후) */
  const runAfterClose = (after: () => void) => {
    afterExitRef.current = after;
    setOpen(false);
  };

  /** 오버레이의 `onExited`에 그대로 연결한다 */
  const onExited = () => {
    const after = afterExitRef.current;
    afterExitRef.current = null;
    onClose();
    after?.();
  };

  return { open, close, runAfterClose, onExited };
}
