import { FixedBottomCTA, ListHeader, Paragraph, TopNavigation } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import { Navigate, useNavigate } from "react-router-dom";
import { useOnboarding } from "../../context/OnboardingContext";
import { formatCurrency } from "../../lib/format";
import { buildOnboardingPlan, draftTotalBudget } from "../../lib/onboarding";
import { AmountField } from "../../components/common/AmountField";

/** 최초 설정 ② 항목별 예산 (S3) */
export function BudgetSetupPage() {
  const { categories, setBudget, setTargetAmountPerUse } = useOnboarding();
  const navigate = useNavigate();

  // 새로고침 등으로 입력값이 비었으면 처음부터
  if (categories.length === 0) return <Navigate to="/onboarding/categories" replace />;

  const total = draftTotalBudget(categories);
  const ready = buildOnboardingPlan({ categories }) !== null;

  return (
    <div className="app-shell onboarding-page">
      <TopNavigation
        content={
          <Paragraph typography="t5" fontWeight="bold" color={adaptive.grey900}>
            <Paragraph.Text>2 / 3</Paragraph.Text>
          </Paragraph>
        }
      />

      <main className="onboarding-body">
        <div className="onboarding-head">
          <Paragraph typography="t3" fontWeight="bold" color={adaptive.grey900}>
            <Paragraph.Text>항목마다 한 달 예산을 정해 주세요.</Paragraph.Text>
          </Paragraph>
          <Paragraph typography="t6" color={adaptive.grey600}>
            <Paragraph.Text>1회 사용 목표 금액은 넣지 않아도 돼요.</Paragraph.Text>
          </Paragraph>
        </div>

        {categories.map((category) => (
          <div key={category.name} className="onboarding-block">
            <ListHeader
              title={
                <ListHeader.TitleParagraph fontWeight="bold">
                  {category.name}
                </ListHeader.TitleParagraph>
              }
            />
            <div className="onboarding-fields">
              <AmountField
                variant="box"
                label="월 예산"
                labelOption="sustain"
                suffix="원"
                value={category.budget}
                onChange={(value) => setBudget(category.name, value)}
                paddingBottom={0}
              />
              <AmountField
                variant="box"
                label="1회 사용 목표 금액"
                labelOption="sustain"
                placeholder="없음"
                suffix="원"
                value={category.targetAmountPerUse}
                onChange={(value) => setTargetAmountPerUse(category.name, value)}
                paddingBottom={0}
              />
            </div>
          </div>
        ))}
      </main>

      <FixedBottomCTA
        topAccessory={
          <Paragraph typography="t6" color={adaptive.grey700} textAlign="center">
            <Paragraph.Text>{`총생활비 ${formatCurrency(total)}`}</Paragraph.Text>
          </Paragraph>
        }
        disabled={!ready}
        onClick={() => navigate("/onboarding/confirm")}
      >
        {ready ? "다음" : "모든 항목의 월 예산을 넣어 주세요"}
      </FixedBottomCTA>
    </div>
  );
}
