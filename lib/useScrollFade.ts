"use client";

import { useEffect, useRef, useState, type DependencyList } from "react";

// 카드 내부 스크롤 목록 하단에 "더 볼 내용이 있음"을 알리는 fade 힌트(ScrollFade.tsx)용 훅.
// 실제로 아래로 스크롤할 내용이 남아있을 때만 canScrollDown이 true이고, 맨 아래까지
// 스크롤하면 자동으로 false가 된다. deps에는 목록 길이처럼 콘텐츠가 바뀌는 값을 넘겨서
// 데이터가 바뀌었을 때도(예: 필터링으로 행이 줄어듦) 다시 계산되게 한다.
export function useScrollFade(deps: DependencyList = []) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  function recompute() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 1);
  }

  useEffect(() => {
    recompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { scrollRef, canScrollDown, onScroll: recompute };
}
