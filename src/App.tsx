import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useBudget } from "./context/BudgetContext";
import { OnboardingProvider } from "./context/OnboardingContext";
import { HomePage } from "./pages/HomePage";
import { SettingsPage } from "./pages/SettingsPage";
import { BudgetSetupPage } from "./pages/onboarding/BudgetSetupPage";
import { CategorySelectPage } from "./pages/onboarding/CategorySelectPage";
import { ConfirmPage } from "./pages/onboarding/ConfirmPage";

/**
 * 진입 게이트. `BudgetProvider`가 저장소를 다 읽은 뒤에만 렌더링되므로
 * 여기서는 읽기 완료를 따로 기다리지 않는다.
 */
function EntryGate() {
  const { hasAnyMonthData } = useBudget();
  return <Navigate to={hasAnyMonthData ? "/home" : "/onboarding/categories"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<EntryGate />} />
      <Route
        path="/onboarding"
        element={
          <OnboardingProvider>
            <Outlet />
          </OnboardingProvider>
        }
      >
        <Route path="categories" element={<CategorySelectPage />} />
        <Route path="budgets" element={<BudgetSetupPage />} />
        <Route path="confirm" element={<ConfirmPage />} />
      </Route>
      <Route path="/home" element={<HomePage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
