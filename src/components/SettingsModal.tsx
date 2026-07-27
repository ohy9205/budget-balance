import { useState } from "react";
import { createPortal } from "react-dom";
import {
  ListHeader,
  Paragraph,
  TopNavigation,
  TopNavigationTextButton,
} from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import type { BudgetCategory, BudgetStore } from "../types";
import { useBudget } from "../context/BudgetContext";
import { sortByOrder } from "../lib/calculations";
import { categoryDefaultDiff } from "../lib/category";
import { formatMonthLabel } from "../lib/date";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { AddCategoryForm } from "./AddCategoryForm";
import { CategoryEditRow } from "./CategoryEditRow";
import { ConfirmDialog } from "./ConfirmDialog";
import { DataManagementSection } from "./DataManagementSection";

interface SettingsModalProps {
  onClose: () => void;
}

type PendingConfirm =
  | { kind: "deleteCategory"; category: BudgetCategory }
  | { kind: "resetCategory"; category: BudgetCategory; changes: string[] }
  | { kind: "resetMonth" }
  | { kind: "import"; store: BudgetStore };

/**
 * 설정·데이터 관리 전체 화면. TDS `Modal`(고정폭 카드 + 포커스 트랩)이 전체 화면 페이지에
 * 맞지 않아 직접 그리는 유일한 오버레이다 — 자세한 제약은 CLAUDE.md 참고.
 * 이 컴포넌트는 셸(포털·상단바·스크롤 잠금·Esc)과 확인 다이얼로그 조율만 담당한다.
 */
export function SettingsModal({ onClose }: SettingsModalProps) {
  const {
    currentMonth,
    monthData,
    addCategory,
    updateCategory,
    deleteCategory,
    moveCategory,
    resetCategoryToDefault,
    resetCurrentMonth,
    exportStore,
    importStore,
  } = useBudget();

  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);

  useBodyScrollLock();
  // 확인 다이얼로그가 떠 있을 때는 Esc를 그쪽에 양보한다.
  useEscapeKey(onClose, confirm === null);

  const categories = monthData ? sortByOrder(monthData.categories) : [];

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
                  {`예산 항목 · ${formatMonthLabel(currentMonth)}`}
                </ListHeader.TitleParagraph>
              }
            />

            {!monthData ? (
              <Paragraph className="settings-note" typography="t7" color={adaptive.grey600}>
                <Paragraph.Text>먼저 이번 달 예산을 생성해 주세요.</Paragraph.Text>
              </Paragraph>
            ) : (
              <div className="cat-edit-list">
                {categories.map((c, idx) => {
                  const changes = categoryDefaultDiff(c);
                  return (
                    <CategoryEditRow
                      key={c.id}
                      category={c}
                      isFirst={idx === 0}
                      isLast={idx === categories.length - 1}
                      changes={changes}
                      onUpdate={(patch) => updateCategory(c.id, patch)}
                      onMove={(direction) => moveCategory(c.id, direction)}
                      onReset={() => setConfirm({ kind: "resetCategory", category: c, changes })}
                      onDelete={() => setConfirm({ kind: "deleteCategory", category: c })}
                    />
                  );
                })}
              </div>
            )}

            {monthData && <AddCategoryForm onAdd={addCategory} />}

            <DataManagementSection
              getStore={exportStore}
              onImportParsed={(store) => setConfirm({ kind: "import", store })}
              onRequestResetMonth={() => setConfirm({ kind: "resetMonth" })}
              hasMonthData={monthData !== null}
            />
          </div>
        </div>,
        document.body,
      )}

      {confirm?.kind === "deleteCategory" && (
        <ConfirmDialog
          title="항목 삭제"
          danger
          message={`'${confirm.category.name}' 항목과 이 달의 해당 지출 내역이 모두 삭제됩니다. 계속할까요?`}
          confirmLabel="삭제"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            deleteCategory(confirm.category.id);
            setConfirm(null);
          }}
        />
      )}

      {confirm?.kind === "resetCategory" && (
        <ConfirmDialog
          title="항목 설정 초기화"
          message={`'${confirm.category.name}' 항목이 기본 예산값(${confirm.changes.join(
            ", ",
          )})으로 되돌아갑니다. 지출 내역은 그대로 유지됩니다. 계속할까요?`}
          confirmLabel="되돌리기"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            resetCategoryToDefault(confirm.category.id);
            setConfirm(null);
          }}
        />
      )}

      {confirm?.kind === "resetMonth" && (
        <ConfirmDialog
          title="이번 달 데이터 초기화"
          danger
          message={`${formatMonthLabel(currentMonth)}의 예산 항목과 지출이 모두 삭제됩니다. 되돌릴 수 없습니다. 계속할까요?`}
          confirmLabel="초기화"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            resetCurrentMonth();
            setConfirm(null);
          }}
        />
      )}

      {confirm?.kind === "import" && (
        <ConfirmDialog
          title="데이터 가져오기"
          danger
          message={`현재 전체 데이터를 파일 내용(${
            Object.keys(confirm.store.months).length
          }개월)으로 교체합니다. 되돌릴 수 없습니다. 계속할까요?`}
          confirmLabel="가져오기"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            importStore(confirm.store);
            setConfirm(null);
          }}
        />
      )}
    </>
  );
}
