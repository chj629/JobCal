interface DashboardGreetingProps {
  userName: string | null;
}

export default function DashboardGreeting({ userName }: DashboardGreetingProps) {
  return (
    <header>
      <h1 className="text-[28px] font-semibold text-foreground">
        안녕하세요, {userName ?? "회원"}님 👋
      </h1>
      <p className="mt-1 text-sm text-secondary">오늘도 취업 활동을 시작해볼까요?</p>
    </header>
  );
}
