import { createClient } from "@supabase/supabase-js";

// service_role 키를 쓰는 관리자 전용 클라이언트. RLS를 우회하므로 브라우저 번들에는 절대
// 포함되면 안 되고, app/api/*의 Route Handler에서 현재 세션 사용자를 먼저 확인한 뒤에만
// 호출한다(예: app/api/account/delete/route.ts). SUPABASE_SERVICE_ROLE_KEY는
// NEXT_PUBLIC_ 접두사가 없어 서버 코드에서만 읽히고 클라이언트에는 절대 노출되지 않는다.
// 짧은 단발성 서버 호출이라 세션 토큰 자동 갱신/영속화는 필요 없어 둘 다 끈다.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
