import { useRef, useState } from "react";
import type { BudgetCategory } from "../types";
import { useBudget } from "../context/BudgetContext";
import { exportStoreJSON, parseImportedJSON } from "../lib/storage";
import { Modal } from "./Modal";
import { ConfirmDialog } from "./ConfirmDialog";

interface SettingsModalProps {
  onClose: () => void;
}

type PendingConfirm =
  | { kind: "deleteCategory"; category: BudgetCategory }
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
    resetCurrentMonth,
    exportStore,
    importStore,
  } = useBudget();

  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [importError, setImportError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 새 항목 입력
  const [newName, setNewName] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [newTarget, setNewTarget] = useState("");

  const categories = monthData
    ? [...monthData.categories].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  const handleAdd = () => {
    const name = newName.trim();
    const budget = Number(newBudget);
    if (!name) return;
    if (!Number.isFinite(budget) || budget < 0) return;
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
      const text = await file.text();
      const store = parseImportedJSON(text);
      setConfirm({ kind: "import", store });
    } catch {
      setImportError("가져오기에 실패했습니다. 올바른 JSON 파일인지 확인해 주세요.");
    } finally {
      // 같은 파일 다시 선택 가능하도록 초기화
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <Modal title="설정 · 데이터 관리" onClose={onClose}>
        <section className="settings-section">
          <h3 className="section-title">예산 항목 ({currentMonth})</h3>
          {!monthData ? (
            <p className="muted">먼저 이번 달 예산을 생성해 주세요.</p>
          ) : (
            <ul className="cat-edit-list">
              {categories.map((c, idx) => (
                <li key={c.id} className="cat-edit-item">
                  <div className="cat-edit-fields">
                    <label className="visually-hidden" htmlFor={`name-${c.id}`}>
                      항목 이름
                    </label>
                    <input
                      id={`name-${c.id}`}
                      type="text"
                      value={c.name}
                      onChange={(e) => updateCategory(c.id, { name: e.target.value })}
                    />
                    <div className="cat-edit-numbers">
                      <label className="mini-label">
                        월 예산
                        <input
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
                      <label className="mini-label">
                        목표 1회 지출액
                        <input
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
                  </div>
                  <div className="cat-edit-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`${c.name} 위로`}
                      disabled={idx === 0}
                      onClick={() => moveCategory(c.id, "up")}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`${c.name} 아래로`}
                      disabled={idx === categories.length - 1}
                      onClick={() => moveCategory(c.id, "down")}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger-outline"
                      onClick={() => setConfirm({ kind: "deleteCategory", category: c })}
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {monthData && (
            <div className="cat-add">
              <h4 className="mini-title">항목 추가</h4>
              <div className="cat-add-fields">
                <input
                  type="text"
                  placeholder="항목 이름"
                  aria-label="새 항목 이름"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <input
                  type="number"
                  min={0}
                  step={1000}
                  placeholder="월 예산"
                  aria-label="새 항목 월 예산"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                />
                <input
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
                  className="btn btn-primary"
                  onClick={handleAdd}
                  disabled={!newName.trim() || newBudget.trim() === ""}
                >
                  추가
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="settings-section">
          <h3 className="section-title">데이터 관리</h3>
          <div className="settings-buttons">
            <button type="button" className="btn" onClick={handleExport}>
              JSON 내보내기
            </button>
            <button
              type="button"
              className="btn"
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
                className="btn btn-danger-outline"
                onClick={() => setConfirm({ kind: "resetMonth" })}
              >
                이번 달 데이터 초기화
              </button>
            )}
          </div>
          {importError && (
            <p className="form-error" role="alert">
              {importError}
            </p>
          )}
          <p className="muted small">
            가져오기를 실행하면 현재 전체 데이터가 파일 내용으로 교체됩니다.
          </p>
        </section>
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

      {confirm?.kind === "resetMonth" && (
        <ConfirmDialog
          title="이번 달 데이터 초기화"
          danger
          message={`${currentMonth}의 예산 항목과 지출이 모두 삭제됩니다. 되돌릴 수 없습니다. 계속할까요?`}
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
