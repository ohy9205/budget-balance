import { useState } from "react";
import {
  Button,
  ListHeader,
  Paragraph,
  TopNavigation,
  TopNavigationTextButton,
} from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import { useNavigate } from "react-router-dom";
import { useBudget } from "../context/BudgetContext";
import { formatMonthLabel } from "../lib/date";
import { ConfirmDialog } from "../components/common/ConfirmDialog";

/** 설정·데이터 관리 화면 (S10) */
export function SettingsPage() {
  const { currentMonth, monthData, resetCurrentMonth } = useBudget();
  const navigate = useNavigate();

  const [confirmingReset, setConfirmingReset] = useState(false);

  return (
    <div className="app-shell settings-page">
      <TopNavigation
        content={
          <Paragraph typography="t5" fontWeight="bold" color={adaptive.grey900}>
            <Paragraph.Text>설정 · 데이터 관리</Paragraph.Text>
          </Paragraph>
        }
        trailing={
          <TopNavigationTextButton onClick={() => navigate("/home")}>
            닫기
          </TopNavigationTextButton>
        }
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
    </div>
  );
}
