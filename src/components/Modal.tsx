import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** 헤더 우측 등에 넣을 추가 액션 (선택) */
  footer?: ReactNode;
}

/** 접근성을 갖춘 공통 다이얼로그. Esc 닫기, 배경 클릭 닫기, aria-modal. */
export function Modal({ title, onClose, children, footer }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2)}`).current;

  // onClose를 ref로 추적해, 아래 effect들이 onClose 참조 변경으로 재실행되지 않게 한다.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Esc 키로 닫기 (마운트 시 한 번만 등록)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // 열릴 때 패널로 포커스 이동 (마운트 시 한 번만 — 매 렌더마다 포커스를 뺏지 않도록)
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={panelRef}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-btn" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
