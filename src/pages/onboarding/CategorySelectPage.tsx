import { useState } from "react";
import {
  Button,
  Chip,
  ChipItem,
  FixedBottomCTA,
  ListHeader,
  Paragraph,
  TextField,
  TopNavigation,
} from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import { useNavigate } from "react-router-dom";
import { DEFAULT_CATEGORY_SEED } from "../../constants";
import { useOnboarding } from "../../context/OnboardingContext";
import { canAddDraftCategory } from "../../lib/onboarding";

/** 최초 설정 ① 항목 선택 (S2) */
export function CategorySelectPage() {
  const { categories, toggleCategory } = useOnboarding();
  const navigate = useNavigate();

  const [customName, setCustomName] = useState("");

  const selectedNames = new Set(categories.map((c) => c.name));
  const canAdd = canAddDraftCategory(categories, customName);
  // 추천 목록에 없는 항목만 따로 보여 준다 (추천은 칩으로 이미 보인다)
  const customCategories = categories.filter(
    (c) => !DEFAULT_CATEGORY_SEED.some((s) => s.name === c.name),
  );

  const addCustom = () => {
    if (!canAdd) return;
    toggleCategory(customName.trim());
    setCustomName("");
  };

  return (
    <div className="app-shell onboarding-page">
      <TopNavigation
        content={
          <Paragraph typography="t5" fontWeight="bold" color={adaptive.grey900}>
            <Paragraph.Text>1 / 3</Paragraph.Text>
          </Paragraph>
        }
      />

      <main className="onboarding-body">
        <div className="onboarding-head">
          <Paragraph typography="t3" fontWeight="bold" color={adaptive.grey900}>
            <Paragraph.Text>어떤 항목을 관리할까요?</Paragraph.Text>
          </Paragraph>
          <Paragraph typography="t6" color={adaptive.grey600}>
            <Paragraph.Text>나중에 언제든 바꿀 수 있어요.</Paragraph.Text>
          </Paragraph>
        </div>

        <Chip wrap kind="select" margin="small" aria-label="추천 항목">
          {DEFAULT_CATEGORY_SEED.map((seed) => (
            <ChipItem
              key={seed.key}
              as="button"
              type="button"
              selected={selectedNames.has(seed.name)}
              aria-pressed={selectedNames.has(seed.name)}
              onClick={() => toggleCategory(seed.name)}
            >
              {seed.name}
            </ChipItem>
          ))}
        </Chip>

        <div className="onboarding-block">
          <ListHeader
            title={
              <ListHeader.TitleParagraph fontWeight="bold">직접 추가</ListHeader.TitleParagraph>
            }
          />
          <div className="onboarding-add">
            <TextField
              variant="box"
              aria-label="항목 이름"
              placeholder="항목 이름"
              autoComplete="off"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              paddingBottom={0}
            />
            <Button size="medium" variant="weak" disabled={!canAdd} onClick={addCustom}>
              추가
            </Button>
          </div>

          {customCategories.length > 0 && (
            <Chip wrap kind="select" margin="small" aria-label="직접 추가한 항목">
              {customCategories.map((c) => (
                <ChipItem
                  key={c.name}
                  as="button"
                  type="button"
                  selected
                  aria-pressed
                  onClick={() => toggleCategory(c.name)}
                >
                  {c.name}
                </ChipItem>
              ))}
            </Chip>
          )}
        </div>
      </main>

      <FixedBottomCTA
        disabled={categories.length === 0}
        onClick={() => navigate("/onboarding/budgets")}
      >
        {categories.length > 0 ? `${categories.length}개 선택 · 다음` : "항목을 하나 이상 골라 주세요"}
      </FixedBottomCTA>
    </div>
  );
}
