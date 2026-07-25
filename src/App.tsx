import { useState } from "react";
import {
  Button,
  FixedBottomCTA,
  ListHeader,
  Paragraph,
  TopNavigation,
  TopNavigationTextButton,
} from "@toss/tds-mobile";
import { TDSMobileAITProvider } from "@toss/tds-mobile-ait";
import { adaptive } from "@toss/tds-colors";
import type { Expense } from "./types";
import { BudgetProvider, useBudget, type NewExpenseInput } from "./context/BudgetContext";
import { allCategoryStats } from "./lib/calculations";
import { getDateKey, getMonthKey, isCurrentMonth } from "./lib/date";
import { MonthSelector } from "./components/MonthSelector";
import { SummaryCard } from "./components/SummaryCard";
import { CategoryCard } from "./components/CategoryCard";
import { QuickExpenseForm } from "./components/QuickExpenseForm";
import { RecentExpenses } from "./components/RecentExpenses";
import { SettingsModal } from "./components/SettingsModal";
import { ConfirmDialog } from "./components/ConfirmDialog";

type ExpenseModalState =
  | { mode: "closed" }
  | { mode: "add"; categoryId?: string }
  | { mode: "edit"; expense: Expense };

function Dashboard() {
  const {
    currentMonth,
    monthData,
    previousMonthWithData,
    prefs,
    createEmptyMonthFromSeed,
    copyFromPreviousMonth,
    addExpense,
    updateExpense,
    deleteExpense,
  } = useBudget();

  const [expenseModal, setExpenseModal] = useState<ExpenseModalState>({ mode: "closed" });
  const [showSettings, setShowSettings] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  // 지출 입력 기본 날짜: 현재 월이면 오늘, 아니면 해당 월 1일
  const defaultDate = isCurrentMonth(currentMonth) ? getDateKey() : `${currentMonth}-01`;

  const handleSubmitExpense = (input: NewExpenseInput) => {
    if (expenseModal.mode === "edit") {
      updateExpense(expenseModal.expense.id, input);
    } else {
      addExpense(input);
    }
  };

  const stats = monthData ? allCategoryStats(monthData) : [];

  return (
    <div className="app-shell">
      <TopNavigation
        fixed
        background="blur"
        content={<MonthSelector />}
        trailing={
          <TopNavigationTextButton disabled={!monthData} onClick={() => setShowSettings(true)}>
            설정
          </TopNavigationTextButton>
        }
      />

      <main className="app-main">
        {monthData && <SummaryCard data={monthData} />}

        {!monthData ? (
          <section className="empty-month">
            <Paragraph typography="t6" color={adaptive.grey600} textAlign="center">
              <Paragraph.Text>
                {getMonthKey() === currentMonth ? "이번 달" : "이 달"} 예산이 아직 없습니다.
              </Paragraph.Text>
            </Paragraph>
            <div className="empty-actions">
              <Button display="block" size="xlarge" onClick={createEmptyMonthFromSeed}>
                기본 예산으로 생성
              </Button>
              <Button
                display="block"
                size="xlarge"
                variant="weak"
                color="light"
                disabled={!previousMonthWithData}
                onClick={copyFromPreviousMonth}
              >
                {previousMonthWithData
                  ? `지난달(${previousMonthWithData}) 예산 복사`
                  : "복사할 지난달 없음"}
              </Button>
            </div>
          </section>
        ) : (
          <>
            <section aria-label="예산 항목">
              <ListHeader
                title={
                  <ListHeader.TitleParagraph fontWeight="bold">
                    예산 항목
                  </ListHeader.TitleParagraph>
                }
                right={
                  <ListHeader.RightText>{`${monthData.categories.length}개 항목`}</ListHeader.RightText>
                }
              />
              <div className="list-rows cats">
                {stats.map((s) => (
                  <CategoryCard
                    key={s.category.id}
                    stats={s}
                    onAddExpense={(categoryId) => setExpenseModal({ mode: "add", categoryId })}
                  />
                ))}
              </div>
            </section>

            <RecentExpenses
              expenses={monthData.expenses}
              categories={monthData.categories}
              onEdit={(expense) => setExpenseModal({ mode: "edit", expense })}
            />
          </>
        )}
      </main>

      {monthData && (
        <FixedBottomCTA onClick={() => setExpenseModal({ mode: "add" })}>
          지출 추가
        </FixedBottomCTA>
      )}

      {expenseModal.mode !== "closed" && monthData && (
        <QuickExpenseForm
          categories={monthData.categories}
          defaultCategoryId={
            expenseModal.mode === "add" ? expenseModal.categoryId ?? prefs.lastCategoryId : undefined
          }
          defaultPaymentMethod={prefs.lastPaymentMethod}
          defaultDate={defaultDate}
          editing={expenseModal.mode === "edit" ? expenseModal.expense : undefined}
          onSubmit={handleSubmitExpense}
          onRequestDelete={(expense) => setDeleteTarget(expense)}
          onClose={() => setExpenseModal({ mode: "closed" })}
        />
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {deleteTarget && (
        <ConfirmDialog
          title="지출 삭제"
          danger
          message="이 지출 내역을 삭제할까요? 삭제하면 해당 항목의 잔액이 복구됩니다."
          confirmLabel="삭제"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteExpense(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <TDSMobileAITProvider>
      <BudgetProvider>
        <Dashboard />
      </BudgetProvider>
    </TDSMobileAITProvider>
  );
}
