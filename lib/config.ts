// 문의 메일 수신 주소. .env.local의 CONTACT_EMAIL만 채우면 된다(코드에 실제 주소를
// 하드코딩하지 않는다). 서버 전용 값이므로 app/api/contact/route.ts에서만 사용하고,
// 클라이언트 컴포넌트에서 import하지 않는다.
export const CONTACT_EMAIL: string | null = process.env.CONTACT_EMAIL || null;
