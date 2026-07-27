# 월간 예산 잔액 관리 (budget-balance)

개인용 월간 예산 잔액 관리 웹앱. 과거 지출 분석이 아니라 **"각 항목에서 이번 달에 얼마 썼고,
앞으로 얼마 더 쓸 수 있는가"** 를 즉시 확인·통제하는 데 초점을 둡니다.

서버·DB·로그인 없이 브라우저 `localStorage`에만 데이터를 저장하는 순수 로컬 웹앱입니다.

## 실행 방법

```bash
npm install
npm run dev      # 개발 서버 (기본 http://localhost:5173)
npm run build    # 타입체크(tsc) + 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
npm run test     # 계산 로직 ㄹㄷㅁㅅ단위 테스트 (Vitest)
```

Node 18+ 권장 (개발 환경: Node 22, npm 10).

## 주요 파일 구조

```
budget-balance/
├─ index.html
├─ vite.config.ts / tsconfig*.json / package.json
└─ src/
   ├─ main.tsx                    # 진입점
   ├─ App.tsx                     # 화면 조립 + 모달 상태 관리
   ├─ types.ts                    # 도메인 타입
   ├─ constants.ts                # 기본 예산 항목 7개, 결제수단, 상태 임계값, 저장 키
   ├─ index.css                   # 최소 스타일 (모바일 1열 / 데스크톱 2~3열)
   ├─ context/
   │  └─ BudgetContext.tsx        # 상태·CRUD·월 이동·prefs 영속화 (라이브러리 없이 Context)
   ├─ lib/
   │  ├─ date.ts                  # 월/날짜 키, 월 진행률, 월 이동
   │  ├─ format.ts                # 금액(1,000원)·퍼센트·날짜 포맷
   │  ├─ calculations.ts          # 핵심 계산 (순수 함수)
   │  ├─ calculations.test.ts     # 단위 테스트 (25개)
   │  └─ storage.ts               # localStorage 방어적 load/save/export/import
   └─ components/
      ├─ MonthSelector.tsx        # 연/월 표시, 이전·다음 달
      ├─ SummaryCard.tsx          # 전체 요약 + 신용/체크 사용액 + 예상 월말 잔액 + 속도 경고
      ├─ CategoryCard.tsx         # 항목별 카드 (진행률 바, 상태 배지, 남은 횟수)
      ├─ QuickExpenseForm.tsx     # 빠른 지출 입력/수정 (모달)
      ├─ RecentExpenses.tsx       # 최근 지출 내역 + 수정/삭제
      ├─ SettingsModal.tsx        # 항목 관리 + 초기화/내보내기/가져오기
      ├─ Modal.tsx                # 접근성 다이얼로그 공통
      └─ ConfirmDialog.tsx        # 파괴적 동작 확인
```

## 구현한 기능

- **월 선택**: 이전/다음 달 이동, 월별 데이터 독립 유지.
- **예산 생성**: 신규 월에 "기본 예산으로 생성" 또는 "지난달 예산 복사"(지출은 복사하지 않음).
- **전체 요약**: 전체 예산 / 사용액 / **남은 금액(강조)** / 사용률 / 신용·체크 카드 사용액.
- **예상 월말 잔액**: 하루 평균 지출 × 월 전체 일수 기반 (현재 월만, 참고용 안내 포함).
- **지출 속도 경고**: 사용률이 월 진행률보다 15%p 이상 높으면 경고 (현재 월만).
- **항목 카드**: 예산/사용/남은 금액/사용률/진행률 바/상태 배지(여유·주의·위험·초과)/남은 사용 가능 횟수.
- **빠른 지출 입력**: 금액·항목·결제수단·날짜·메모, 기본 날짜=오늘, 최근 항목·결제수단 기억,
  Enter/저장 등록, 등록 후 폼 초기화(최근값 유지), 0원·음수·비정수 차단.
- **지출 수정/삭제**: 삭제 전 확인 다이얼로그.
- **항목 관리**: 추가·이름/예산/목표액 수정·순서 변경(↑↓)·삭제(확인).
- **데이터 관리**: 이번 달 초기화, 전체 JSON 내보내기, JSON 가져오기(모두 확인 절차).
- **방어 로직**: 손상되거나 없는 localStorage 데이터를 정규화/무시하여 앱이 깨지지 않음.

## 예산 경고 규칙

| 사용률 | 상태 |
| --- | --- |
| 0% 이상 60% 미만 | 여유 |
| 60% 이상 80% 미만 | 주의 |
| 80% 이상 100% 이하 | 위험 |
| 100% 초과 | 초과 |

색상과 함께 텍스트 배지로도 상태를 표시합니다.

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
        { "id": "…", "name": "평일 만남 식비", "monthlyBudget": 270000,
          "targetExpenseAmount": 25000, "sortOrder": 0 }
      ],
      "expenses": [
        { "id": "…", "categoryId": "…", "amount": 25000, "paymentMethod": "credit",
          "date": "2026-07-24", "memo": "점심", "createdAt": "2026-07-24T09:00:00.000Z" }
      ]
    }
  }
}
```

- 금액은 모두 정수 원 단위.
- `paymentMethod`: `"credit"`(신용카드) | `"debit"`(체크카드).

## 향후 개선 가능한 사항

- UI/디자인 다듬기 (이후 단계 예정): 색 테마, 다크모드, 애니메이션, 정보 위계.
- 항목 순서 변경을 드래그 앤 드롭으로.
- 결제수단 사용자 정의 추가.
- 카테고리별 지출 필터/검색, 기간 비교.
- 데이터 백업 자동화, 여러 기기 동기화.
