import { Button, Paragraph, TopNavigation } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import { useNavigate } from "react-router-dom";
import { useBudget } from "../../context/BudgetContext";

/** 최초 설정 ① 항목 선택 (S2). 4단계에서 추천 항목 선택 화면으로 교체한다. */
export function CategorySelectPage() {
  const { createEmptyMonthFromSeed } = useBudget();
  const navigate = useNavigate();

  return (
    <div className="app-shell settings-page">
      <TopNavigation
        content={
          <Paragraph typography="t5" fontWeight="bold" color={adaptive.grey900}>
            <Paragraph.Text>최초 설정</Paragraph.Text>
          </Paragraph>
        }
      />

      <div className="settings-body">
        <Paragraph className="settings-note" typography="t6" color={adaptive.grey600}>
          <Paragraph.Text>기본 예산 항목으로 시작할 수 있습니다.</Paragraph.Text>
        </Paragraph>
        <div className="data-btns">
          <Button
            display="block"
            size="xlarge"
            onClick={() => {
              createEmptyMonthFromSeed();
              navigate("/home", { replace: true });
            }}
          >
            기본 예산으로 시작하기
          </Button>
        </div>
      </div>
    </div>
  );
}
