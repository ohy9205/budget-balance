import { adaptive } from "@toss/tds-colors";
import type { BudgetStatus } from "../lib/calculations";

/**
 * 예산 상태 → TDS 색·뱃지 매핑.
 * 신호등 의미(여유/주의/위험/소진/초과)를 TDS 팔레트로만 표현한다 — 임의 hex를 쓰지 않는다.
 * 색이 겹치는 단계는 뱃지 variant(weak/fill)로 구분한다.
 */
export const STATUS_BADGE: Record<
  BudgetStatus,
  { color: "blue" | "yellow" | "red"; variant: "weak" | "fill" }
> = {
  normal: { color: "blue", variant: "weak" },
  caution: { color: "yellow", variant: "weak" },
  warning: { color: "yellow", variant: "fill" },
  exhausted: { color: "red", variant: "weak" },
  over: { color: "red", variant: "fill" },
};

/** 진행 바·수치 강조에 쓰는 상태색 */
export const STATUS_COLOR: Record<BudgetStatus, string> = {
  normal: adaptive.blue500,
  caution: adaptive.yellow500,
  warning: adaptive.orange700,
  exhausted: adaptive.red500,
  over: adaptive.red500,
};

/** ProgressBar는 0~1 범위를 받는다. 사용률(%)을 그 범위로 자른다. */
export function toProgress(usageRate: number): number {
  return Math.min(1, Math.max(0, usageRate / 100));
}
