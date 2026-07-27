import { forwardRef } from "react";
import { TextField, type TextFieldProps } from "@toss/tds-mobile";
import { formatThousands, toAmountDigits } from "../lib/format";

export interface AmountFieldProps
  extends Omit<TextFieldProps, "value" | "onChange" | "type" | "inputMode"> {
  /** 정수 원 단위 금액. 입력이 비어 있으면 undefined */
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

/**
 * 금액 입력 필드. 표시는 천단위 콤마, 입력은 숫자만 남기고 앞자리 0·자릿수 초과를 잘라 낸다.
 * `type="number"`나 TDS `NumberKeypad`를 쓰지 않는 이유는 CLAUDE.md 참고 —
 * 금액 필드는 전부 이 컴포넌트를 거쳐 `formatThousands`↔`toAmountDigits` 쌍을 보장한다.
 */
export const AmountField = forwardRef<HTMLInputElement, AmountFieldProps>(function AmountField(
  { value, onChange, ...rest },
  ref,
) {
  return (
    <TextField
      {...rest}
      ref={ref}
      type="text"
      inputMode="numeric"
      value={value === undefined ? "" : formatThousands(value)}
      onChange={(e) => {
        const digits = toAmountDigits(e.target.value);
        onChange(digits === "" ? undefined : Number(digits));
      }}
    />
  );
});
