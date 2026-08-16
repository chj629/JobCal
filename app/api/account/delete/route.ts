import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// 현재 로그인한 사용자 "본인"의 auth.users 행만 admin API로 삭제한다. 클라이언트가
// user_id를 요청 바디로 보내는 방식은 절대 쓰지 않는다 — 임의의 다른 계정을 지정해
// 삭제하는 것을 막기 위해, 삭제 대상은 항상 이 요청의 쿠키 기반 세션(supabase.auth.getUser())
// 에서만 얻는다. companies 등 사용자 관련 테이블은 모두 auth.users(id)를 ON DELETE CASCADE로
// 참조하므로(supabase/migrations 참고), 이 auth.users 행 삭제만으로 나머지 데이터가
// DB 레벨에서 함께 삭제된다 — 테이블별로 개별 삭제를 호출하지 않는다.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json({ error: "계정 삭제 기능이 아직 설정되지 않았습니다." }, { status: 500 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    // 사용자 식별 정보는 로그에 남기지 않고 진단에 필요한 정보만 출력한다.
    console.error("[account/delete] auth.admin.deleteUser 실패:", {
      status: error.status,
      message: error.message,
    });
    return NextResponse.json({ error: "계정 삭제에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
