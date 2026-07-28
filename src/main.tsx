import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { TDSMobileAITProvider } from "@toss/tds-mobile-ait";
import App from "./App";
import { BudgetProvider } from "./context/BudgetContext";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root 요소를 찾을 수 없습니다.");

createRoot(rootElement).render(
  <StrictMode>
    <TDSMobileAITProvider>
      <BudgetProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </BudgetProvider>
    </TDSMobileAITProvider>
  </StrictMode>,
);
