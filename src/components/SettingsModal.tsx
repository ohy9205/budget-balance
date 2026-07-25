import { useId, useRef, useState } from "react";
import type { BudgetCategory } from "../types";
import { useBudget } from "../context/BudgetContext";
import { formatMonthLabel } from "../lib/date";
import { exportStoreJSON, parseImportedJSON } from "../lib/storage";
import { Modal } from "./Modal";
import { ConfirmDialog } from "./ConfirmDialog";

interface SettingsModalProps {
  onClose: () => void;
}

type PendingConfirm =
  | { kind: "deleteCategory"; category: BudgetCategory }
  | { kind: "resetCategory"; category: BudgetCategory; count: number }
  | { kind: "resetMonth" }
  | { kind: "import"; store: ReturnType<typeof parseImportedJSON> };

export function SettingsModal({ onClose }: SettingsModalProps) {
  const {
    currentMonth,
    monthData,
    addCategory,
    updateCategory,
    deleteCategory,
    moveCategory,
    resetCategoryExpenses,
    resetCurrentMonth,
    exportStore,
    importStore,
  } = useBudget();

  const titleId = useId();
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 새 항목 입력
  const [newName, setNewName] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [newTarget, setNewTarget] = useState("");

  const categories = monthData
    ? [...monthData.categories].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  // 항목별 지출 건수 (초기화 버튼 활성/비활성 및 안내 문구용)
  const expenseCounts = new Map<string, number>();
  for (const e of monthData?.expenses ?? []) {
    expenseCounts.set(e.categoryId, (expenseCounts.get(e.categoryId) ?? 0) + 1);
  }

  const addDisabled = !newName.trim() || newBudget.trim() === "";

  const handleAdd = () => {
    const name = newName.trim();
    const budget = Number(newBudget);
    if (!name || !Number.isFinite(budget) || budget < 0) return;
    const target = newTarget.trim() === "" ? undefined : Number(newTarget);
    addCategory({
      name,
      monthlyBudget: Math.round(budget),
      targetExpenseAmount: target && target > 0 ? Math.round(target) : undefined,
    });
    setNewName("");
    setNewBudget("");
    setNewTarget("");
  };

  const handleExport = () => {
    const json = exportStoreJSON(exportStore());
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-balance-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError("");
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const store = parseImportedJSON(await file.text());
      setConfirm({ kind: "import", store });
    } catch {
      setImportError("가져오기에 실패했습니다. 올바른 JSON 파일인지 확인해 주세요.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <Modal variant="fullscreen" backdrop={false} labelledBy={titleId} onClose={onClose}>
        <div className="settings-panel">
          <div className="settings-head">
            <span className="settings-title" id={titleId}>
              설정 · 데이터 관리
            </span>
            <button type="button" className="sheet-close" aria-label="닫기" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="settings-body">
            <div className="settings-label">예산 항목 · {formatMonthLabel(currentMonth)}</div>

            {!monthData ? (
              <p className="data-note">먼저 이번 달 예산을 생성해 주세요.</p>
            ) : (
              <div className="cat-edit-list">
                {categories.map((c, idx) => (
                  <div key={c.id} className="cat-edit">
                    <div className="cat-edit-fields">
                      <input
                        className="set-input cat-edit-name"
                        type="text"
                        aria-label="항목 이름"
                        value={c.name}
                        onChange={(e) => updateCategory(c.id, { name: e.target.value })}
                      />
                      <div className="cat-edit-nums">
                        <label className="mini-field">
                          월 예산
                          <input
                            className="set-input"
                            type="number"
                            min={0}
                            step={1000}
                            value={c.monthlyBudget}
                            onChange={(e) =>
                              updateCategory(c.id, {
                                monthlyBudget: Math.max(0, Math.round(Number(e.target.value) || 0)),
                              })
                            }
                          />
                        </label>
                        <label className="mini-field">
                          목표 1회 지출액
                          <input
                            className="set-input"
                            type="number"
                            min={0}
                            step={1000}
                            placeholder="없음"
                            value={c.targetExpenseAmount ?? ""}
                            onChange={(e) => {
                              const v = e.target.value.trim();
                              updateCategory(c.id, {
                                targetExpenseAmount:
                                  v === "" || Number(v) <= 0 ? undefined : Math.round(Number(v)),
                              });
                            }}
                          />
                        </label>
                      </div>
                      <div className="cat-edit-actions">
                        <button
                          type="button"
                          className="icon-sq"
                          aria-label={`${c.name} 위로`}
                          disabled={idx === 0}
                          onClick={() => moveCategory(c.id, "up")}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="icon-sq"
                          aria-label={`${c.name} 아래로`}
                          disabled={idx === categories.length - 1}
                          onClick={() => moveCategory(c.id, "down")}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="reset-btn"
                          aria-label={`${c.name} 지출 초기화`}
                          title="이 항목의 지출 초기화"
                          disabled={(expenseCounts.get(c.id) ?? 0) === 0}
                          onClick={() =>
                            setConfirm({
                              kind: "resetCategory",
                              category: c,
                              count: expenseCounts.get(c.id) ?? 0,
                            })
                          }
                        >
                          <span className="reset-glyph" aria-hidden="true">
                            ↺
                          </span>
                          지출 초기화
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="cat-del"
                      aria-label={`${c.name} 삭제`}
                      onClick={() => setConfirm({ kind: "deleteCategory", category: c })}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {monthData && (
              <div className="settings-group">
                <div className="settings-grouptitle">항목 추가</div>
                <div className="add-fields">
                  <input
                    className="set-input"
                    type="text"
                    placeholder="항목 이름"
                    aria-label="새 항목 이름"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <input
                    className="set-input"
                    type="number"
                    min={0}
                    step={1000}
                    placeholder="월 예산"
                    aria-label="새 항목 월 예산"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                  />
                  <input
                    className="set-input"
                    type="number"
                    min={0}
                    step={1000}
                    placeholder="목표 1회 지출액 (선택)"
                    aria-label="새 항목 목표 1회 지출액"
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                  />
                  <button
                    type="button"
                    className="add-btn"
                    onClick={handleAdd}
                    disabled={addDisabled}
                  >
                    추가
                  </button>
                </div>
              </div>
            )}

            <div className="settings-group">
              <div className="settings-grouptitle">데이터 관리</div>
              <div className="data-btns">
                <button type="button" className="data-btn" onClick={handleExport}>
                  JSON 내보내기
                </button>
                <button
                  type="button"
                  className="data-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  JSON 가져오기
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="visually-hidden"
                  onChange={handleFileChange}
                />
                {monthData && (
                  <button
                    type="button"
                    className="data-btn danger"
                    onClick={() => setConfirm({ kind: "resetMonth" })}
                  >
                    이번 달 데이터 초기화
                  </button>
                )}
              </div>
              {importError && (
                <p className="data-note" role="alert" style={{ color: "var(--danger)" }}>
                  {importError}
                </p>
              )}
              <p className="data-note">
                가져오기를 실행하면 현재 전체 데이터가 파일 내용으로 교체됩니다.
              </p>
            </div>
          </div>
        </div>
      </Modal>

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
          title="항목 지출 초기화"
          danger
          message={`'${confirm.category.name}'의 이 달 지출 ${confirm.count}건이 모두 삭제되고 사용액이 0원이 됩니다. 예산 설정은 그대로 유지됩니다. 계속할까요?`}
          confirmLabel="초기화"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            resetCategoryExpenses(confirm.category.id);
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
