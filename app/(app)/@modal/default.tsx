// 병렬 라우트 슬롯 규칙: 이 슬롯에 매칭되는 활성 라우트가 없을 때(일반 /companies,
// /dashboard 등 방문 및 /companies/[id] 하드 내비게이션/새로고침) Next.js가 이 default를
// 렌더링한다. 아무것도 띄우지 않아야 하므로 null만 반환한다.
export default function ModalSlotDefault() {
  return null;
}
