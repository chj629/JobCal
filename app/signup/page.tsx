"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/locale-context";
import AuthLayout from "@/components/auth/AuthLayout";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

const MIN_PASSWORD_LENGTH = 6;
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 30;

function mapSignUpError(t: (key: string) => string, message: string): string {
  if (message.toLowerCase().includes("already registered")) {
    return t("auth.errors.alreadyRegistered");
  }
  return t("auth.errors.signupFailed");
}

export default function SignupPage() {
  const router = useRouter();
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage("");

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setErrorMessage(t("auth.errors.allFieldsRequired"));
      return;
    }
    if (name.trim().length < MIN_NAME_LENGTH || name.trim().length > MAX_NAME_LENGTH) {
      setErrorMessage(
        t("auth.errors.nameLength", { min: MIN_NAME_LENGTH, max: MAX_NAME_LENGTH })
      );
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(t("auth.errors.passwordMinLength", { min: MIN_PASSWORD_LENGTH }));
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(t("auth.errors.passwordMismatch"));
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        data: {
          display_name: name.trim(),
        },
      },
    });

    if (error) {
      setErrorMessage(mapSignUpError(t, error.message));
      setIsLoading(false);
      return;
    }

    // 이메일 확인이 꺼져 있는 프로젝트는 signUp() 즉시 세션이 발급된다.
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setConfirmationSent(true);
    setIsLoading(false);
  }

  if (confirmationSent) {
    return (
      <AuthLayout>
        <div className="w-full max-w-sm rounded-[10px] border border-border bg-card p-8 text-center">
          <h1 className="text-[28px] font-semibold text-foreground">
            {t("auth.signup.confirmedTitle")}
          </h1>
          <p className="mt-2 text-sm text-secondary">
            {t("auth.signup.confirmedMessage", { email })}
          </p>
          <Link
            href="/login"
            className="mt-8 inline-block text-sm font-medium text-primary hover:underline"
          >
            {t("auth.signup.backToLogin")}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm rounded-[10px] border border-border bg-card p-8">
        <h1 className="text-center text-[28px] font-semibold text-foreground">
          {t("auth.signup.title")}
        </h1>
        <p className="mt-2 text-center text-sm text-secondary">{t("auth.signup.description")}</p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <Input
            type="text"
            icon={User}
            label={t("auth.signup.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
          />
          <Input
            type="email"
            icon={Mail}
            label={t("auth.signup.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            icon={Lock}
            label={t("auth.signup.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            type="password"
            icon={Lock}
            label={t("auth.signup.confirmPassword")}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {errorMessage && <p className="text-xs text-error">{errorMessage}</p>}

          <Button type="submit" variant="primary" disabled={isLoading} className="mt-2 w-full">
            {isLoading ? t("auth.signup.submitLoading") : t("auth.signup.submit")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-secondary">
          {t("auth.signup.loginPrompt")}{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t("auth.signup.loginLink")}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
