import { useRef, useState } from "react";
import {
  Border,
  Button,
  IconButton,
  ListHeader,
  Modal,
  Paragraph,
  TextField,
  TopNavigation,
  TopNavigationTextButton,
} from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import type { BudgetCategory } from "../types";
import { useBudget } from "../context/BudgetContext";
import { findCategorySeed } from "../constants";
import { formatMonthLabel } from "../lib/date";
import { formatCurrency } from "../lib/format";
import { exportStoreJSON, parseImportedJSON } from "../lib/storage";
import { ConfirmDialog } from "./ConfirmDialog";

interface SettingsModalProps {
  onClose: () => void;
}

type PendingConfirm =
  | { kind: "deleteCategory"; category: BudgetCategory }
  | { kind: "resetCategory"; category: BudgetCategory; changes: string[] }
  | { kind: "resetMonth" }
  | { kind: "import"; store: ReturnType<typeof parseImportedJSON> };

/** 기본 예산값과 달라진 설정만 "월 예산 270,000원" 형태로 나열 (기본 항목이 아니거나 같으면 빈 배열) */
function defaultDiff(c: BudgetCategory): string[] {
  const seed = findCategorySeed(c.seedKey);
  if (!seed) return [];
  const parts: string[] = [];
  if (c.name !== seed.name) parts.push(`이름 ${seed.name}`);
  if (c.monthlyBudget !== seed.monthlyBudget) {
    parts.push(`월 예산 ${formatCurrency(seed.monthlyBudget)}`);
  }
  if (c.targetExpenseAmount !== seed.targetExpenseAmount) {
    parts.push(
      `목표 1회 지출액 ${
        seed.targetExpenseAmount ? formatCurrency(seed.targetExpenseAmount) : "없음"
      }`,
    );
  }
  return parts;
}

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
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 새 항목 입력
  const [newName, setNewName] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [newTarget, setNewTarget] = useState("");

  const categories = monthData
    ? [...monthData.categories].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

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
      <Modal open>
        <Modal.Overlay onClick={onClose} />
        <Modal.Content className="settings-panel" aria-label="설정 · 데이터 관리">
          <TopNavigation
            content={
              <Paragraph typography="t5" fontWeight="bold" color={adaptive.grey900}>
                <Paragraph.Text>설정 · 데이터 관리</Paragraph.Text>
              </Paragraph>
            }
            trailing={
              <TopNavigationTextButton onClick={onClose}>닫기</TopNavigationTextButton>
            }
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
              <Paragraph typography="t7" color={adaptive.grey600}>
                <Paragraph.Text>먼저 이번 달 예산을 생성해 주세요.</Paragraph.Text>
              </Paragraph>
            ) : (
              <div className="cat-edit-list">
                {categories.map((c, idx) => {
                  const changes = defaultDiff(c);
                  return (
                    <div key={c.id} className="cat-edit">
                      <div className="cat-edit-head">
                        <TextField
                          variant="box"
                          label="항목 이름"
                          labelOption="sustain"
                          value={c.name}
                          onChange={(e) => updateCategory(c.id, { name: e.target.value })}
                        />
                        <IconButton
                          name="icon-x-circle-mono"
                          aria-label={`${c.name} 삭제`}
                          color={adaptive.grey400}
                          onClick={() => setConfirm({ kind: "deleteCategory", category: c })}
                        />
                      </div>

                      <div className="cat-edit-nums">
                        <TextField
                          variant="box"
                          label="월 예산"
                          labelOption="sustain"
                          type="number"
                          min={0}
                          step={1000}
                          suffix="원"
                          value={c.monthlyBudget}
                          onChange={(e) =>
                            updateCategory(c.id, {
                              monthlyBudget: Math.max(0, Math.round(Number(e.target.value) || 0)),
                            })
                          }
                        />
                        <TextField
                          variant="box"
                          label="목표 1회 지출액"
                          labelOption="sustain"
                          type="number"
                          min={0}
                          step={1000}
                          placeholder="없음"
                          suffix="원"
                          value={c.targetExpenseAmount ?? ""}
                          onChange={(e) => {
                            const v = e.target.value.trim();
                            updateCategory(c.id, {
                              targetExpenseAmount:
                                v === "" || Number(v) <= 0 ? undefined : Math.round(Number(v)),
                            });
                          }}
                        />
                      </div>

                      {changes.length > 0 && (
                        <Paragraph typography="st13" color={adaptive.grey500}>
                          <Paragraph.Text>{`기본값 · ${changes.join(" · ")}`}</Paragraph.Text>
                        </Paragraph>
                      )}

                      <div className="cat-edit-actions">
                        <IconButton
                          name="icon-arrow-up-mono"
                          aria-label={`${c.name} 위로`}
                          color={adaptive.grey600}
                          disabled={idx === 0}
                          onClick={() => moveCategory(c.id, "up")}
                        />
                        <IconButton
                          name="icon-arrow-down-mono"
                          aria-label={`${c.name} 아래로`}
                          color={adaptive.grey600}
                          disabled={idx === categories.length - 1}
                          onClick={() => moveCategory(c.id, "down")}
                        />
                        <Button
                          size="small"
                          variant="weak"
                          color="light"
                          aria-label={`${c.name} 설정을 기본값으로 되돌리기`}
                          title={
                            c.seedKey
                              ? "이름·월 예산·목표 1회 지출액을 기본 예산값으로 되돌립니다"
                              : "직접 추가한 항목이라 되돌릴 기본값이 없습니다"
                          }
                          disabled={changes.length === 0}
                          onClick={() => setConfirm({ kind: "resetCategory", category: c, changes })}
                        >
                          기본값으로
                        </Button>
                      </div>

                      <Border variant="full" />
                    </div>
                  );
                })}
              </div>
            )}

            {monthData && (
              <section className="settings-group">
                <ListHeader
                  title={
                    <ListHeader.TitleParagraph fontWeight="bold">
                      항목 추가
                    </ListHeader.TitleParagraph>
                  }
                />
                <div className="add-fields">
                  <TextField
                    variant="box"
                    label="항목 이름"
                    labelOption="sustain"
                    placeholder="항목 이름"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <TextField
                    variant="box"
                    label="월 예산"
                    labelOption="sustain"
                    type="number"
                    min={0}
                    step={1000}
                    suffix="원"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                  />
                  <TextField
                    variant="box"
                    label="목표 1회 지출액 (선택)"
                    labelOption="sustain"
                    type="number"
                    min={0}
                    step={1000}
                    suffix="원"
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                  />
                  <Button
                    display="block"
                    size="large"
                    disabled={addDisabled}
                    onClick={handleAdd}
                  >
                    추가
                  </Button>
                </div>
              </section>
            )}

            <section className="settings-group">
              <ListHeader
                title={
                  <ListHeader.TitleParagraph fontWeight="bold">
                    데이터 관리
                  </ListHeader.TitleParagraph>
                }
              />
              <div className="data-btns">
                <Button variant="weak" color="light" size="medium" onClick={handleExport}>
                  JSON 내보내기
                </Button>
                <Button
                  variant="weak"
                  color="light"
                  size="medium"
                  onClick={() => fileInputRef.current?.click()}
                >
                  JSON 가져오기
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="visually-hidden"
                  onChange={handleFileChange}
                />
                {monthData && (
                  <Button
                    variant="weak"
                    color="danger"
                    size="medium"
                    onClick={() => setConfirm({ kind: "resetMonth" })}
                  >
                    이번 달 데이터 초기화
                  </Button>
                )}
              </div>
              {importError && (
                <Paragraph typography="t7" color={adaptive.red500}>
                  <Paragraph.Text role="alert">{importError}</Paragraph.Text>
                </Paragraph>
              )}
              <Paragraph typography="st13" color={adaptive.grey500}>
                <Paragraph.Text>
                  가져오기를 실행하면 현재 전체 데이터가 파일 내용으로 교체됩니다.
                </Paragraph.Text>
              </Paragraph>
            </section>
          </div>
        </Modal.Content>
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
