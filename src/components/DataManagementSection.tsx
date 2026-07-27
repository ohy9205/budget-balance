import { useRef, useState } from "react";
import { Button, ListHeader, Paragraph } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import type { BudgetStore } from "../types";
import { exportStoreJSON, parseImportedJSON } from "../lib/storage";

interface DataManagementSectionProps {
  /** 내보낼 전체 데이터 */
  getStore: () => BudgetStore;
  /** 파일을 성공적으로 읽었을 때 — 실제 교체는 부모가 확인 다이얼로그를 거쳐 수행한다 */
  onImportParsed: (store: BudgetStore) => void;
  onRequestResetMonth: () => void;
  hasMonthData: boolean;
}

/** Blob 다운로드 — DOM을 만지므로 lib(순수 계층)가 아니라 여기 둔다. */
function downloadTextFile(fileName: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/** 설정 화면의 데이터 관리 — 내보내기/가져오기/이번 달 초기화. 파일·DOM 세부를 여기 가둔다. */
export function DataManagementSection({
  getStore,
  onImportParsed,
  onRequestResetMonth,
  hasMonthData,
}: DataManagementSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState("");

  const handleExport = () => {
    const today = new Date().toISOString().slice(0, 10);
    downloadTextFile(`budget-balance-${today}.json`, exportStoreJSON(getStore()));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError("");
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      onImportParsed(parseImportedJSON(await file.text()));
    } catch {
      setImportError("가져오기에 실패했습니다. 올바른 JSON 파일인지 확인해 주세요.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <section className="settings-group">
      <ListHeader
        title={<ListHeader.TitleParagraph fontWeight="bold">데이터 관리</ListHeader.TitleParagraph>}
      />
      <div className="data-btns">
        <Button variant="weak" color="dark" size="medium" onClick={handleExport}>
          JSON 내보내기
        </Button>
        <Button
          variant="weak"
          color="dark"
          size="medium"
          onClick={() => fileInputRef.current?.click()}
        >
          JSON 가져오기
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          onChange={handleFileChange}
        />
        {hasMonthData && (
          <Button variant="weak" color="danger" size="medium" onClick={onRequestResetMonth}>
            이번 달 데이터 초기화
          </Button>
        )}
      </div>
      {importError && (
        <Paragraph className="settings-note" typography="t7" color={adaptive.red500}>
          <Paragraph.Text role="alert">{importError}</Paragraph.Text>
        </Paragraph>
      )}
      <Paragraph className="settings-note" typography="st13" color={adaptive.grey500}>
        <Paragraph.Text>
          가져오기를 실행하면 현재 전체 데이터가 파일 내용으로 교체됩니다.
        </Paragraph.Text>
      </Paragraph>
    </section>
  );
}
