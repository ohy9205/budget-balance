import { Badge, type BadgeProps } from "@toss/tds-mobile";
import { STATUS_LABEL, type BudgetStatus } from "../../lib/calculations";
import { STATUS_BADGE } from "./statusTheme";

interface StatusBadgeProps {
  status: BudgetStatus;
  size?: BadgeProps["size"];
}

/** 예산 상태 뱃지 — 라벨·색·variant 조합을 한곳에 묶어 카드가 상태색을 몰라도 되게 한다. */
export function StatusBadge({ status, size = "small" }: StatusBadgeProps) {
  const { color, variant } = STATUS_BADGE[status];
  return (
    <Badge size={size} variant={variant} color={color}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
