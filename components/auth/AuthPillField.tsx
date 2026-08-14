import type { InputHTMLAttributes, ReactNode } from "react";

export interface AuthPillFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: ReactNode;
  // 라벨 오른쪽에 추가 요소(예: 로그인 화면의 "パスワードをお忘れですか?" 링크)를 둘 때 사용.
  labelSlot?: ReactNode;
  // 입력창 오른쪽 안쪽에 겹쳐 두는 요소(비밀번호 표시/숨김 토글 버튼 등).
  rightSlot?: ReactNode;
}

// docs/stitch/인증플로우/*의 pill 입력창(label + rounded-full input, 필요시 우측 아이콘/라벨
// 옆 링크). 공용 Input(components/ui/Input.tsx)은 좌측 아이콘 + rounded-lg 스타일이라 이
// 화면들과 달라 전역 컴포넌트는 바꾸지 않고 인증 화면 전용 컴포넌트로 둔다. app/signup/page.tsx가
// 이 구조를 SignupField라는 이름의 로컬 컴포넌트로 처음 구현했고, /login부터 여기로 옮겨
// 공유한다(signup은 이번 범위에서 수정하지 않아 당장은 로컬 버전과 공존).
export default function AuthPillField({
  id,
  label,
  labelSlot,
  rightSlot,
  className = "",
  ...props
}: AuthPillFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-[14px] font-[400] text-neutral-900">
          {label}
        </label>
        {labelSlot}
      </div>
      <div className="relative">
        <input
          id={id}
          className={
            "w-full rounded-full border border-neutral-300 bg-white px-5 py-3.5 text-[15px] text-neutral-900 placeholder:text-neutral-300 transition-all focus:border-primary-navy focus:outline-none focus:ring-2 focus:ring-[#dbeafe] " +
            className
          }
          {...props}
        />
        {rightSlot && (
          <div className="absolute top-1/2 right-5 flex -translate-y-1/2 items-center">{rightSlot}</div>
        )}
      </div>
    </div>
  );
}
