interface ScrollFadeProps {
  visible: boolean;
}

// 카드 내부 스크롤 영역 하단에 붙이는 은은한 fade 힌트(useScrollFade와 함께 쓴다).
// 스크롤 영역을 감싸는 relative 부모의 마지막 자식으로 렌더해야 한다(스크롤 영역
// 내부에 넣으면 콘텐츠와 함께 스크롤돼버려 항상 같은 자리에 고정되지 않는다).
export default function ScrollFade({ visible }: ScrollFadeProps) {
  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-[inherit] bg-gradient-to-t from-card via-card/60 to-transparent" />
  );
}
