import { useState } from "react";
import { Button, ListHeader, TextField } from "@toss/tds-mobile";
import type { NewCategoryInput } from "../types";
import { buildNewCategoryInput, isValidNewCategory } from "../lib/category";
import { AmountField } from "./AmountField";

interface AddCategoryFormProps {
  onAdd: (input: NewCategoryInput) => void;
}

/** 설정 화면의 항목 추가 폼. 입력·검증을 안에 가두고 부모에는 완성된 입력값만 올린다. */
export function AddCategoryForm({ onAdd }: AddCategoryFormProps) {
  const [name, setName] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState<number | undefined>(undefined);
  const [targetExpenseAmount, setTargetExpenseAmount] = useState<number | undefined>(undefined);

  const fields = { name, monthlyBudget, targetExpenseAmount };

  const handleAdd = () => {
    const input = buildNewCategoryInput(fields);
    if (!input) return;
    onAdd(input);
    setName("");
    setMonthlyBudget(undefined);
    setTargetExpenseAmount(undefined);
  };

  return (
    <section className="settings-group">
      <ListHeader
        title={<ListHeader.TitleParagraph fontWeight="bold">항목 추가</ListHeader.TitleParagraph>}
      />
      <div className="add-fields">
        <TextField
          variant="box"
          label="항목 이름"
          labelOption="sustain"
          placeholder="항목 이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          paddingBottom={0}
        />
        <AmountField
          variant="box"
          label="월 예산"
          labelOption="sustain"
          suffix="원"
          value={monthlyBudget}
          onChange={setMonthlyBudget}
          paddingBottom={0}
        />
        <AmountField
          variant="box"
          label="목표 1회 지출액 (선택)"
          labelOption="sustain"
          suffix="원"
          value={targetExpenseAmount}
          onChange={setTargetExpenseAmount}
        />
        <Button
          display="block"
          size="large"
          disabled={!isValidNewCategory(fields)}
          onClick={handleAdd}
        >
          추가
        </Button>
      </div>
    </section>
  );
}
