import { useSortable } from "@dnd-kit/react/sortable";
import { Border, ListRow, Menu, Paragraph, ProgressBar } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import type { CategoryStats } from "../../lib/calculations";
import { formatCurrency, formatPercent, formatThousands } from "../../lib/format";
import { StatusBadge } from "../common/StatusBadge";
import { STATUS_COLOR, toProgress } from "../common/statusTheme";

/** `preview`는 아직 누르고 있는 단계 — 이어서 끌 수 있어야 해 포인터를 받지 않는다. */
export type CardMenuState = "closed" | "preview" | "open";

interface CategoryCardProps {
  stats: CategoryStats;
  /** 화면 순서 — dnd-kit이 정렬 위치를 계산하는 기준 */
  index: number;
  menu: CardMenuState;
  onAddExpense: (categoryId: string) => void;
  onRequestEdit: () => void;
  onRequestDelete: () => void;
  /** 드래그 뒤 따라오는 유령 클릭이면 true */
  isClickSuppressed: () => boolean;
}

/**
 * 예산 항목 한 행. 짧게 누르면 지출 추가, 길게 누르면 수정·삭제 메뉴,
 * 누른 채로 끌면 순서 변경이다.
 */
export function CategoryCard({
  stats,
  index,
  menu,
  onAddExpense,
  onRequestEdit,
  onRequestDelete,
  isClickSuppressed,
}: CategoryCardProps) {
  const { category, budget, used, remaining, usageRate, status, remainingCount } = stats;
  const over = remaining < 0;

  const { ref, isDragging } = useSortable({ id: category.id, index });

  return (
    <div
      ref={ref}
      className="cat-sortable"
      // 메뉴가 열린 카드는 스크림 위로, 끄는 카드는 형제 행 위로 올린다
      style={menu !== "closed" ? { zIndex: 40 } : isDragging ? { zIndex: 2 } : undefined}
    >
      <ListRow
        as="button"
        type="button"
        className="cat-row"
        border="none"
        verticalPadding="medium"
        horizontalPadding="small"
        withTouchEffect
        aria-label={`${category.name} 지출 추가`}
        onClick={() => {
          if (isClickSuppressed()) return;
          onAddExpense(category.id);
        }}
        contents={
          <div className="cat-body">
            <div className="cat-line">
              <div className="cat-name">
                <Paragraph typography="t5" fontWeight="bold" color={adaptive.grey900}>
                  <Paragraph.Text>{category.name}</Paragraph.Text>
                </Paragraph>
                <StatusBadge status={status} size="xsmall" />
              </div>
              {/* 남은 금액이 이 카드의 첫 정보다 — 라벨을 붙여 예산·사용액과 헷갈리지 않게 한다 */}
              <Paragraph
                typography="t4"
                fontWeight="bold"
                color={over ? adaptive.red500 : adaptive.grey900}
              >
                <Paragraph.Text typography="t7" fontWeight="medium" color={adaptive.grey500}>
                  {over ? "초과 " : "남은 "}
                </Paragraph.Text>
                <Paragraph.Text>{formatCurrency(Math.abs(remaining))}</Paragraph.Text>
              </Paragraph>
            </div>

            <div className="cat-line">
              {/* 쓴 금액만 진하게, 나머지(예산·남은 횟수)는 흐리게 */}
              <div className="cat-meta">
                <Paragraph typography="t7" fontWeight="semibold" color={adaptive.grey700}>
                  <Paragraph.Text>{formatThousands(used)}</Paragraph.Text>
                </Paragraph>
                <Paragraph typography="t7" color={adaptive.grey500}>
                  <Paragraph.Text>
                    / {formatCurrency(budget)}
                    {remainingCount !== undefined ? ` · 남은 ${remainingCount}회` : ""}
                  </Paragraph.Text>
                </Paragraph>
              </div>
              <Paragraph typography="t7" fontWeight="semibold" color={STATUS_COLOR[status]}>
                <Paragraph.Text>{formatPercent(usageRate)}</Paragraph.Text>
              </Paragraph>
            </div>

            <ProgressBar
              className="cat-bar"
              size="normal"
              progress={toProgress(usageRate)}
              color={STATUS_COLOR[status]}
            />
          </div>
        }
      />

      {/* 카드 사이 구분선 — 카드와 함께 끌려야 하므로 목록이 아니라 카드가 들고 있다.
          마지막 카드 뒤는 index.css에서 숨긴다. */}
      <Border variant="full" className="cat-divider" />

      {menu !== "closed" && (
        // 위치는 래퍼가 잡는다 — Menu.Dropdown 자신이 position: relative라
        // 같은 요소에 absolute를 주면 emotion 스타일에 밀린다.
        // Menu.Trigger는 자체 dim이 드래그 중 포인터를 가로채므로 표면만 쓴다.
        <div className={menu === "preview" ? "cat-menu cat-menu--preview" : "cat-menu"}>
          <Menu.Dropdown aria-label={`${category.name} 항목 메뉴`}>
            <Menu.DropdownItem onClick={onRequestEdit}>수정</Menu.DropdownItem>
            <Menu.DropdownItem onClick={onRequestDelete}>
              <Paragraph typography="t5" fontWeight="medium" color={adaptive.red500}>
                <Paragraph.Text>삭제</Paragraph.Text>
              </Paragraph>
            </Menu.DropdownItem>
          </Menu.Dropdown>
        </div>
      )}
    </div>
  );
}
