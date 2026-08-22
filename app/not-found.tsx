import NotFoundContent from "@/components/NotFoundContent";

// Next.js는 기본적으로 app/not-found.tsx를 "/_not-found"라는 단일 정적 라우트로 빌드
// 시점에 한 번만 프리렌더한다 — 그 시점엔 실제 요청 URL이 없어
// components/NotFoundContent.tsx의 usePathname()이 진짜 방문 경로를 알 수 없고, 빌드
// 시점에 고정된 값(항상 ja)으로 HTML이 굳어버린다. 이후 어떤 404 URL(/ko/* 포함)을
// 방문하든 이 동일한 정적 HTML이 먼저 전달되고, 클라이언트가 실제 경로를 읽어 다시
// 렌더링하며 서버 결과와 달라져 React Hydration Error #418이 발생했다(next build &&
// next start로 실제 재현·확인, 3개의 서로 다른 URL이 완전히 동일한 MD5 해시의 HTML을
// 반환함을 확인해 "빌드 시점에 고정된 단일 스냅샷"임을 검증했다).
//
// 이 라우트만 매 요청마다 새로 렌더링하도록 강제하면(다른 43개 라우트는 여전히 정적—
// next build 결과로 확인), 실제 요청이 들어올 때 usePathname()이 서버·클라이언트
// 양쪽에서 동일하게 진짜 방문 경로를 반영해 애초에 불일치가 생기지 않는다 —
// suppressHydrationWarning이나 마운트 후 값을 덮어쓰는 방식이 아니라, mismatch 자체가
// 구조적으로 발생하지 않게 하는 방법이다.
export const dynamic = "force-dynamic";

export default function NotFound() {
  return <NotFoundContent />;
}
