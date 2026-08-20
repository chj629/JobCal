import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const EMAIL = "jobcal.pro.badge.check@example.com";
const PASSWORD = "TestVerify12345!";

const { data: user, error } = await admin.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
});
if (error) throw error;

await admin.from("paddle_customers").insert({
  user_id: user.user.id,
  paddle_customer_id: "ctm_pro_badge_check",
});

await admin.from("paddle_subscriptions").insert({
  paddle_subscription_id: "sub_pro_badge_check",
  user_id: user.user.id,
  paddle_customer_id: "ctm_pro_badge_check",
  status: "active",
  price_id: "pri_test",
});

console.log("USER_ID", user.user.id);
console.log("EMAIL", EMAIL);
console.log("PASSWORD", PASSWORD);
