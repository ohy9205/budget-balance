import { useEffect, useRef, useState } from "react";

/** 딤 영역을 눌러 닫을 수 있도록 시트 위쪽에 남겨 둘 여백 */
const SHEET_TOP_GAP = 24;

/**
 * 키보드 위로 실제 보이는 영역에 맞춰 시트 높이를 자른다.
 * TDS 기본 높이는 키보드가 떠도 줄지 않아 금액 입력이 화면 밖으로 밀린다.
 * `BottomSheet`의 `maxHeight` prop은 마운트 시점 값으로 굳으므로 `style`로 덮어써야 한다.
 */
export function useSheetMaxHeight() {
  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  // 비율 상한은 항상 "키보드가 없을 때"의 높이를 기준으로 잡는다.
  const fullHeightRef = useRef(0);

  useEffect(() => {
    const update = () => {
      const visible = window.visualViewport?.height ?? window.innerHeight;
      fullHeightRef.current = Math.max(fullHeightRef.current, window.innerHeight);
      setMaxHeight(Math.min(visible - SHEET_TOP_GAP, fullHeightRef.current * 0.7));
    };

    update();
    window.visualViewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return maxHeight;
}
