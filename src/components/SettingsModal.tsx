import { useState } from "react";
import { createPortal } from "react-dom";
import {
  Button,
  ListHeader,
  Paragraph,
  TopNavigation,
  TopNavigationTextButton,
} from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import { useBudget } from "../context/BudgetContext";
import { formatMonthLabel } from "../lib/date";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { ConfirmDialog } from "./ConfirmDialog";

interface SettingsModalProps {
  onClose: () => void;
}

/**
 * 설정·데이터 관리 전체 화면. TDS `Modal`(고정폭 카드 + 포커스 트랩)이 전체 화면 페이지에
 * 맞지 않아 직접 그리는 유일한 오버레이다 — 자세한 제약은 CLAUDE.md 참고.
 * 이 컴포넌트는 셸(포털·상단바·스크롤 잠금·Esc)과 확인 다이얼로그 조율만 담당한다.
 */
export function SettingsModal({ onClose }: SettingsModalProps) {
  const { currentMonth, monthData, resetCurrentMonth } = useBudget();

  const [confirmingReset, setConfirmingReset] = useState(false);

  useBodyScrollLock();
  // 확인 다이얼로그가 떠 있을 때는 Esc를 그쪽에 양보한다.
  useEscapeKey(onClose, !confirmingReset);

  return (
    <>
      {/* `.app-shell`의 transform 밖에서 fixed가 뷰포트 기준이 되도록 body로 포털한다. */}
      {createPortal(
        <div
          className="settings-panel"
          role="dialog"
          aria-modal="true"
          aria-label="설정 · 데이터 관리"
        >
          <TopNavigation
            content={
              <Paragraph typography="t5" fontWeight="bold" color={adaptive.grey900}>
                <Paragraph.Text>설정 · 데이터 관리</Paragraph.Text>
              </Paragraph>
            }
            trailing={<TopNavigationTextButton onClick={onClose}>닫기</TopNavigationTextButton>}
          />

          <div className="settings-body">
            <ListHeader
              title={
                <ListHeader.TitleParagraph fontWeight="bold">
                  {`데이터 관리 · ${formatMonthLabel(currentMonth)}`}
                </ListHeader.TitleParagraph>
              }
            />

            {!monthData ? (
              <Paragraph className="settings-note" typography="t7" color={adaptive.grey600}>
                <Paragraph.Text>먼저 이번 달 예산을 생성해 주세요.</Paragraph.Text>
              </Paragraph>
            ) : (
              <div className="data-btns">
                <Button
                  variant="weak"
                  color="danger"
                  size="medium"
                  onClick={() => setConfirmingReset(true)}
                >
                  이번 달 데이터 초기화
                </Button>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}

      {confirmingReset && (
        <ConfirmDialog
          title="이번 달 데이터 초기화"
          danger
          message={`${formatMonthLabel(currentMonth)}의 예산 항목과 지출이 모두 삭제됩니다. 되돌릴 수 없습니다. 계속할까요?`}
          confirmLabel="초기화"
          onCancel={() => setConfirmingReset(false)}
          onConfirm={() => {
            resetCurrentMonth();
            setConfirmingReset(false);
          }}
        />
      )}
    </>
  );
}
