import { Navigate, Route, Routes } from "react-router-dom";
import { useBudget } from "./context/BudgetContext";
import { HomePage } from "./pages/HomePage";
import { SettingsPage } from "./pages/SettingsPage";
import { CategorySelectPage } from "./pages/onboarding/CategorySelectPage";

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
      <Route path="/onboarding/categories" element={<CategorySelectPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
