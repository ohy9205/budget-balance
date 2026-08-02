import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  // 콘솔에 등록된 appName과 반드시 같아야 한다 (intoss://budget-balance)
  appName: "budget-balance",
  brand: {
    // TDSMobileAITProvider의 기본값(blue500)과 맞춘다
    primaryColor: "#3182F6",
  },
  // localStorage만 쓰므로 네이티브 권한은 필요 없다
  permissions: [],
  webView: {},
  webBundleDir: "dist",
});
