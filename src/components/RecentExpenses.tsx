import { useState } from "react";
import { ListHeader, ListRow, Paragraph, TextButton } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import type { BudgetCategory, Expense } from "../types";
import { paymentMethodLabel } from "../constants";
import { buildCategoryNameLookup } from "../lib/category";
import { sortExpensesByRecency } from "../lib/expense";
import { formatCurrency, formatDateLabel } from "../lib/format";

interface RecentExpensesProps {
  expenses: Expense[];
  categories: BudgetCategory[];
  onEdit: (expense: Expense) => void;
}

const RECENT_LIMIT = 6;

/** 최근 지출 — 접기/펼치기 가능한 목록(최신 6건). 행 클릭 = 수정 시트. */
export function RecentExpenses({ expenses, categories, onEdit }: RecentExpensesProps) {
  const [open, setOpen] = useState(true);

  const categoryName = buildCategoryNameLookup(categories);
  const recent = sortExpensesByRecency(expenses).slice(0, RECENT_LIMIT);

  return (
    <section aria-label="최근 지출">
      <div className="section-head">
        <ListHeader
          title={
            <ListHeader.TitleParagraph fontWeight="bold">최근 지출</ListHeader.TitleParagraph>
          }
          right={
            <TextButton
              size="small"
              variant="clear"
              color={adaptive.grey600}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {`${expenses.length}건 · ${open ? "접기" : "펼치기"}`}
            </TextButton>
          }
        />
      </div>

      {open &&
        (recent.length === 0 ? (
          <div className="section-card list-empty">
            <Paragraph typography="t7" color={adaptive.grey500} textAlign="center">
              <Paragraph.Text>아직 등록된 지출이 없습니다.</Paragraph.Text>
            </Paragraph>
          </div>
        ) : (
          <div className="section-card list-rows">
            {recent.map((e) => (
              <ListRow
                key={e.id}
                as="button"
                type="button"
                className="exp-row"
                horizontalPadding="small"
                withTouchEffect
                arrowType="right"
                aria-label={`${categoryName(e.categoryId)} ${formatCurrency(e.amount)} 지출 수정`}
                onClick={() => onEdit(e)}
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={categoryName(e.categoryId)}
                    bottom={`${formatDateLabel(e.date)} · ${paymentMethodLabel(e.paymentMethod)}${
                      e.memo ? ` · ${e.memo}` : ""
                    }`}
                  />
                }
                right={
                  <ListRow.Text typography="t6" fontWeight="semibold" color={adaptive.grey900}>
                    {formatCurrency(e.amount)}
                  </ListRow.Text>
                }
              />
            ))}
          </div>
        ))}
    </section>
  );
}
