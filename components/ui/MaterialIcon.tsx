export interface MaterialIconProps {
  name: string;
  size?: number;
  filled?: boolean;
  className?: string;
}

// docs/stitch/ 리뉴얼: Stitch가 쓰는 Google Material Symbols Outlined 아이콘을
// 리거처 텍스트(예: "home", "check_box")로 그대로 재현한다. 폰트/기본 스타일은
// app/layout.tsx의 <link>와 app/globals.css의 .material-symbols-outlined를 참고.
export default function MaterialIcon({ name, size = 20, filled = false, className = "" }: MaterialIconProps) {
  return (
    <span
      aria-hidden="true"
      style={{ fontSize: size }}
      className={"material-symbols-outlined" + (filled ? " fill" : "") + (className ? " " + className : "")}
    >
      {name}
    </span>
  );
}
