import { useId } from "react";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** 삭제·초기화 등 파괴적 동작 전 확인 다이얼로그 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "확인",
  cancelLabel = "취소",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();

  return (
    <Modal variant="center" labelledBy={titleId} onClose={onCancel} className="confirm">
      <div className="confirm-title" id={titleId}>
        {title}
      </div>
      <p className="confirm-msg">{message}</p>
      <div className="confirm-actions">
        <button type="button" className="confirm-cancel" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`confirm-ok ${danger ? "danger" : ""}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
