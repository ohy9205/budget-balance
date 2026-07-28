import { FixedBottomCTA, ListRow, Paragraph, TopNavigation } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import { Navigate, useNavigate } from "react-router-dom";
import { useBudget } from "../../context/BudgetContext";
import { useOnboarding } from "../../context/OnboardingContext";
import { formatCurrency } from "../../lib/format";
import { buildOnboardingPlan } from "../../lib/onboarding";

/** 최초 설정 ③ 최종 확인 (S4) */
export function ConfirmPage() {
  const { categories } = useOnboarding();
  const { startMonthWithCategories } = useBudget();
  const navigate = useNavigate();

  const plan = buildOnboardingPlan({ categories });
  // 앞 화면을 거치지 않았거나 입력이 덜 찼으면 되돌린다
  if (plan === null) return <Navigate to="/onboarding/categories" replace />;

  const total = plan.reduce((sum, c) => sum + c.budget, 0);

  const start = () => {
    startMonthWithCategories(plan);
    navigate("/home", { replace: true });
  };

  return (
    <div className="app-shell onboarding-page">
      <TopNavigation
        content={
          <Paragraph typography="t5" fontWeight="bold" color={adaptive.grey900}>
            <Paragraph.Text>3 / 3</Paragraph.Text>
          </Paragraph>
        }
      />

      <main className="onboarding-body">
        <div className="onboarding-head">
          <Paragraph typography="t3" fontWeight="bold" color={adaptive.grey900}>
            <Paragraph.Text>이대로 시작할까요?</Paragraph.Text>
          </Paragraph>
          <Paragraph typography="t6" color={adaptive.grey600}>
            <Paragraph.Text>{`한 달 총생활비 ${formatCurrency(total)}`}</Paragraph.Text>
          </Paragraph>
        </div>

        <div className="section-card list-rows">
          {plan.map((category) => (
            <ListRow
              key={category.name}
              horizontalPadding="small"
              contents={
                category.targetAmountPerUse ? (
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={category.name}
                    bottom={`1회 ${formatCurrency(category.targetAmountPerUse)}`}
                  />
                ) : (
                  <ListRow.Texts type="1RowTypeA" top={category.name} />
                )
              }
              right={
                <ListRow.Text typography="t6" fontWeight="semibold" color={adaptive.grey900}>
                  {formatCurrency(category.budget)}
                </ListRow.Text>
              }
            />
          ))}
        </div>
      </main>

      <FixedBottomCTA onClick={start}>이대로 시작하기</FixedBottomCTA>
    </div>
  );
}
