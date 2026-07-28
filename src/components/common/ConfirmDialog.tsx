import { ConfirmDialog as TDSConfirmDialog } from "@toss/tds-mobile";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** 삭제·초기화 등 파괴적 동작 전 확인 다이얼로그 (TDS ConfirmDialog 래퍼) */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "확인",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <TDSConfirmDialog
      open
      title={title}
      description={message}
      onClose={onCancel}
      cancelButton={
        <TDSConfirmDialog.CancelButton onClick={onCancel}>취소</TDSConfirmDialog.CancelButton>
      }
      confirmButton={
        <TDSConfirmDialog.ConfirmButton
          color={danger ? "danger" : "primary"}
          onClick={onConfirm}
        >
          {confirmLabel}
        </TDSConfirmDialog.ConfirmButton>
      }
    />
  );
}
