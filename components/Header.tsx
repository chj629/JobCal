"use client";

import { Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";
import { useT } from "@/lib/locale-context";

export interface HeaderProps {
  aiDrawerOpen: boolean;
  onOpenAiDrawer: () => void;
}

// 7_homeAION.png 상단바 우측의 AI 진입 버튼만 이번 Step 범위로 가져온다(알림/도움말
// 아이콘, 인사말 등 나머지 상단바 구성은 이번 Step 요구사항이 아니라 제외).
export default function Header({ aiDrawerOpen, onOpenAiDrawer }: HeaderProps) {
  const t = useT();

  return (
    <header className="flex h-14 shrink-0 items-center justify-end border-b border-border bg-card px-6">
      {!aiDrawerOpen && (
        <Button type="button" variant="secondary" size="sm" onClick={onOpenAiDrawer}>
          <Sparkles size={16} />
          {t("common.appName")} AI
        </Button>
      )}
    </header>
  );
}
