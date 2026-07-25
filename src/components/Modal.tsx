import { useEffect, useRef, type ReactNode } from "react";

type ModalVariant = "sheet" | "fullscreen" | "center";

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  /** 오버레이 배치: 하단 시트 / 전체 화면 / 가운데 */
  variant?: ModalVariant;
  /** 패널을 가리키는 제목 요소 id (aria-labelledby) */
  labelledBy?: string;
  /** 반투명 배경을 렌더링할지 (전체 화면 설정 시트는 배경 없음) */
  backdrop?: boolean;
  className?: string;
}

/**
 * 접근성을 갖춘 공용 오버레이. Esc 닫기, 배경 클릭 닫기, 포커스 이동, aria-modal.
 * 헤더/내용은 호출부가 디자인에 맞춰 직접 렌더링한다.
 */
export function Modal({
  onClose,
  children,
  variant = "center",
  labelledBy,
  backdrop = true,
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // onClose를 ref로 추적해, effect가 참조 변경으로 재실행되지 않게 한다.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div className={`overlay ${variant}`} onMouseDown={onClose}>
      {backdrop && <div className="backdrop" />}
      <div
        className={className}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        ref={panelRef}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
