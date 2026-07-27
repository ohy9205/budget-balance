# 월간 예산 잔액 관리 (budget-balance)

개인용 월간 예산 잔액 관리 웹앱. 과거 지출 분석이 아니라 **"각 항목에서 이번 달에 얼마 썼고,
앞으로 얼마 더 쓸 수 있는가"** 를 즉시 확인·통제하는 데 초점을 둡니다.

서버·DB·로그인 없이 브라우저 `localStorage`에만 데이터를 저장하는 순수 로컬 웹앱입니다.
UI는 토스 [TDS Mobile](https://tossmini-docs.toss.im/tds-mobile/)로 만든 모바일 전용 1열 화면이며,
데스크톱에서는 460px 컬럼으로 중앙에 놓입니다.

## 실행 방법

```bash
npm install
npm run dev          # 개발 서버 (기본 http://localhost:5173)
npm run build        # 타입체크(tsc -b) + 프로덕션 빌드
npm run preview      # 빌드 결과 미리보기
npm test             # 단위 테스트 (Vitest, 120개)
npm run test:watch   # 테스트 watch 모드
```

Node 18+ 권장 (개발 환경: Node 22, npm 10). 린트 설정은 없고 `npm run build`의
`tsc`(strict, noUnusedLocals, noUnusedParameters)가 유일한 정적 검사입니다.

## 기능

- **월 이동** — 상단 내비게이션의 좌우 화살표로 이전/다음 달. 월별 데이터는 완전히 독립적이며
  항목 id도 월마다 따로 발급됩니다.
- **예산 생성** — 데이터가 없는 달에 "기본 예산으로 생성"(기본 항목 7개) 또는
  "지난달 예산 복사". 복사는 항목·금액만 가져오고 **지출은 복사하지 않습니다**.
- **이번 달 요약** — 남은 금액(강조), 전체 사용률 진행 바, 상태 뱃지, 예산/사용액,
  신용·체크 카드별 사용액, **예상 잔액**(하루 평균 × 월 전체 일수, 현재 월에만 표시).
- **항목 카드** — 남은 금액, 사용률, 진행 바, 상태 뱃지, `사용액 / 예산`,
  목표 1회 지출액이 있으면 "남은 N회". **카드를 누르면 그 항목으로 지출 추가 시트가 열립니다.**
- **지출 추가·수정** — 화면 하단의 "지출 추가" 버튼이나 항목 카드를 눌러 여는 하단 시트에서
  금액·항목·결제수단을 입력합니다. 금액은 천단위 콤마로
  표시되고 숫자 키보드로 받습니다(Enter로 저장). 날짜는 자동으로 정해지며(현재 월이면 오늘,
  지난 달이면 그 달 1일) 수정 시에는 원본 날짜를 유지합니다. 최근에 쓴 항목·결제수단을 기억해
  다음 입력의 기본값으로 씁니다.
- **최근 지출** — 최신 6건, 접기/펼치기. 행을 누르면 수정 시트가 열리고 그 안에서 삭제할 수
  있습니다(확인 다이얼로그).
- **설정(전체 화면)** — 항목별 이름·월 예산·목표 1회 지출액 편집(입력할 때마다 즉시 저장),
  순서 변경(↑↓), **기본값으로 되돌리기**(어떤 값이 어떻게 바뀌는지 안내 후 실행),
  항목 삭제(해당 지출도 함께 삭제), 항목 추가, 이번 달 데이터 초기화. 파괴적인 동작은 모두
  확인 다이얼로그를 거칩니다.
- **방어 로딩** — 저장된 데이터가 손상되었거나 형식이 달라도 예외를 던지지 않습니다.
  필드별로 정규화하고 쓸 수 없는 레코드만 버려서 앱이 깨지지 않습니다.

다크 모드는 지원하지 않습니다(TDS 색 설정을 light로 고정).

## 예산 경고 규칙

| 사용률 | 상태 | 뱃지 |
| --- | --- | --- |
| 0% 이상 60% 미만 | 여유 | 파랑 |
| 60% 이상 80% 미만 | 주의 | 노랑 |
| 80% 이상 100% 이하 | 위험 | 빨강(연한) |
| 100% 초과 | 초과 | 빨강(채움) |

색만으로 구분하지 않고 텍스트 뱃지를 함께 표시하며, 위험과 초과는 같은 빨강이지만
뱃지 스타일(연한/채움)로 구분합니다. 예산이 0인데 지출이 있으면 사용률을 `Infinity` 대신
`100 + 사용액`으로 계산해 "초과"로 처리합니다.

## 파일 구조

```
budget-balance/
├─ index.html
├─ vite.config.ts / tsconfig*.json / package.json
├─ CLAUDE.md                       # 코드 작업 시 지켜야 할 규칙·제약 (상세)
└─ src/
   ├─ main.tsx                     # 진입점
   ├─ App.tsx                      # TDS provider + 대시보드 조립, 시트/설정 열림 상태
   ├─ types.ts                     # 도메인 타입 + 입력 타입
   ├─ constants.ts                 # 기본 예산 항목 7개, 결제수단, 상태 임계값, 저장 키
   ├─ index.css                    # 레이아웃 전용 (460px 컬럼, 간격, 흰 카드 면) — 색·타이포는 TDS
   ├─ context/
   │  └─ BudgetContext.tsx         # 상태 보관 + 영속화. 도메인 규칙은 갖지 않는다
   ├─ lib/                         # 순수 로직 (React·DOM 없음, 테스트가 있는 유일한 계층)
   │  ├─ calculations.ts           # 사용률·상태·항목 통계·월 요약·예상 잔액
   │  ├─ category.ts               # 항목 정렬·검증·생성·순서 이동·기본값 되돌리기
   │  ├─ expense.ts                # 지출 생성·수정·최신순 정렬
   │  ├─ month.ts                  # 월 데이터 생성·복사·삭제, 지난달 찾기
   │  ├─ storage.ts                # localStorage 저장·복원 + 방어적 정규화
   │  ├─ date.ts                   # 월/날짜 키, 월 이동, 월 일수
   │  ├─ format.ts                 # 금액(1,000원)·퍼센트·날짜·천단위 입력 정규화
   │  ├─ id.ts                     # id 발급 (유일한 비순수 함수)
   │  └─ *.test.ts                 # 5개 파일, 120개 테스트
   ├─ hooks/                       # 관심사 하나씩 담은 작은 훅
   │  ├─ useEscapeKey.ts           # Esc 닫기
   │  ├─ useBodyScrollLock.ts      # 오버레이 중 배경 스크롤 잠금
   │  ├─ useDeferredClose.ts       # 닫힘 애니메이션 후 후처리
   │  ├─ useSheetMaxHeight.ts      # 키보드가 뜰 때 시트 높이 자르기
   │  └─ useAutoFocus.ts           # 마운트 후 입력 포커스
   └─ components/
      ├─ MonthSelector.tsx         # 연/월 표시, 이전·다음 달
      ├─ SummaryCard.tsx           # 이번 달 요약
      ├─ CategoryCard.tsx          # 항목별 카드
      ├─ QuickExpenseForm.tsx      # 지출 추가·수정 하단 시트
      ├─ RecentExpenses.tsx        # 최근 지출 목록
      ├─ SettingsModal.tsx         # 설정 전체 화면 (셸 + 확인 다이얼로그 조율)
      ├─ CategoryEditRow.tsx       # 설정: 항목 편집 한 줄
      ├─ AddCategoryForm.tsx       # 설정: 항목 추가 폼
      ├─ AmountField.tsx           # 금액 입력 공통 (천단위 표시 ↔ 숫자)
      ├─ StatusBadge.tsx           # 상태 뱃지
      ├─ statusTheme.ts            # 상태 → TDS 색·뱃지 매핑
      └─ ConfirmDialog.tsx         # 파괴적 동작 확인
```

## 아키텍처

세 계층을 의도적으로 분리합니다.

1. **순수 로직** (`src/lib/`, `types.ts`, `constants.ts`) — React·DOM 없이 값만 다룹니다.
   테스트가 있는 유일한 계층입니다.
2. **상태** (`src/context/BudgetContext.tsx`) — 전체 저장소와 선택된 월, 최근 사용값을 갖고
   `localStorage`에 영속화합니다. 각 액션은 1계층의 순수 함수를 호출하는 얇은 래퍼입니다.
3. **표현** (`src/App.tsx`, `src/components/`, `src/hooks/`, `src/index.css`) — 컴포넌트는
   JSX와 지역 폼 상태만 갖고, 계산·검증은 1계층에, 상태/이펙트/DOM 관심사는 훅으로 뺍니다.

계층 경계와 지켜야 할 제약(금액 정수 규칙, 월 독립성, `seedKey` 동작, TDS 사용 규칙 등)은
[CLAUDE.md](CLAUDE.md)에 자세히 적혀 있습니다.

## localStorage 데이터 구조

- 키 `budget-balance:data:v1` — 전체 데이터
- 키 `budget-balance:prefs:v1` — 최근 사용한 항목/결제수단

```jsonc
{
  "version": 1,
  "months": {
    "2026-07": {
      "month": "2026-07",
      "categories": [
        { "id": "…", "name": "평일 데이트", "monthlyBudget": 270000,
          "targetExpenseAmount": 25000, "sortOrder": 0, "seedKey": "weekday-meal" }
      ],
      "expenses": [
        { "id": "…", "categoryId": "…", "amount": 25000, "paymentMethod": "credit",
          "date": "2026-07-24", "memo": "점심", "createdAt": "2026-07-24T09:00:00.000Z" }
      ]
    }
  }
}
```

- 금액은 모두 **정수 원 단위**입니다.
- `paymentMethod`: `"credit"`(신용카드) | `"debit"`(체크카드).
- `seedKey`는 기본 예산 항목에서 온 항목이라는 표시입니다. 이름을 바꿔도 이 키로 기본값을
  찾아가므로 "기본값으로 되돌리기"가 동작합니다. 직접 추가한 항목에는 없습니다.
- `memo`는 저장·정렬에는 살아 있지만 현재 입력 UI가 없습니다.
- 저장 키에 버전이 붙어 있습니다. 데이터 형태를 바꿀 때는 기존 키를 재해석하지 말고
  새 키 + 마이그레이션으로 처리해야 합니다.

## 향후 개선 가능한 사항

- 항목 순서 변경을 드래그 앤 드롭으로.
- 지출 메모 입력 UI 복원, 날짜 직접 선택.
- 결제수단 사용자 정의 추가.
- 컴포넌트 테스트 환경(jsdom + Testing Library) 도입 — 현재는 로직 계층만 테스트합니다.
- 항목별 지출 목록·필터, 월 비교.
- 여러 기기 동기화.
