"use client";

import { useEffect, useRef, useState } from "react";
import { CheckoutEventNames, initializePaddle, type Paddle } from "@paddle/paddle-js";
import { translate } from "@/lib/locale-context";
import type { Locale } from "@/lib/i18n/messages";
import { getCheckoutCustomer } from "@/lib/paddle/customerSelection";
import { getConfiguredPaddleProPriceId } from "@/lib/paddle/proPrice";
import { useToast } from "@/components/ui/Toast";

interface UsePaddleCheckoutParams {
  userId: string | null;
  email: string;
  locale: Locale;
  // CHECKOUT_COMPLETED 직후 호출된다. Paddle webhook → DB 반영에는 시간차가 있을 수
  // 있어, 이 훅 자신은 subscription 상태를 알지 못한다 — 실제 재조회(bounded retry
  // 등)는 이 콜백을 넘기는 쪽이 직접 구현한다. 넘기지 않으면(랜딩/pricing) 기존과
  // 동일하게 동작한다.
  onCheckoutCompleted?: () => void;
}

interface UsePaddleCheckoutResult {
  isReady: boolean;
  isCheckoutBusy: boolean;
  openCheckout: () => Promise<void>;
}

interface CheckoutEligibilityResponse {
  allowed?: boolean;
  reason?: "existing_subscription";
  paddleCustomerId?: string | null;
}

// app/(app)/settings/page.tsx의 Plan 탭이 쓰던 Paddle Checkout 초기화/오픈 로직을 그대로
// 옮긴 공용 훅. 랜딩/ /pricing / Settings 세 곳이 각자 이 훅을 한 번씩만 호출해야
// initializePaddle이 페이지당 정확히 한 번만 등록된다(같은 페이지 안에서 이 훅을 여러
// 컴포넌트가 동시에 부르면 안 됨). Pro 권한 판정은 이 훅이 절대 하지 않는다 — webhook이
// 채우는 paddle_subscriptions만이 유일한 source of truth로 남는다(기존 원칙 그대로).
export function usePaddleCheckout({
  userId,
  email,
  locale,
  onCheckoutCompleted,
}: UsePaddleCheckoutParams): UsePaddleCheckoutResult {
  const { showToast } = useToast();
  const [paddleInstance, setPaddleInstance] = useState<Paddle | null>(null);
  const [isCheckoutBusy, setIsCheckoutBusy] = useState(false);
  // React state는 같은 렌더 안의 연속 클릭 사이에 즉시 바뀌지 않으므로 동기 ref를 함께
  // 사용한다. 서버 검증 요청이 시작되는 순간 잠가 빠른 더블클릭도 요청/Checkout 하나로
  // 수렴시킨다.
  const checkoutBusyRef = useRef(false);
  const checkoutCompletedRef = useRef(false);
  // Paddle의 eventCallback은 initializePaddle 최초 호출 시 한 번만 등록되므로(재호출은
  // SDK가 무시/경고함) 그 안에서 최신 locale로 토스트 문구를 고르려면 클로저 대신 ref로
  // 읽어야 한다 — locale을 effect deps에 넣으면 locale이 바뀔 때마다 이 effect가
  // 재실행되어 initializePaddle을 다시 호출하게 된다. onCheckoutCompleted도 같은 이유로
  // ref로 읽는다(호출부가 매 렌더 새 함수를 넘겨도 eventCallback을 재등록하지 않기 위함).
  const localeRef = useRef(locale);
  const onCheckoutCompletedRef = useRef(onCheckoutCompleted);

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  useEffect(() => {
    onCheckoutCompletedRef.current = onCheckoutCompleted;
  }, [onCheckoutCompleted]);

  // NEXT_PUBLIC_PADDLE_CLIENT_TOKEN이 아직 설정되지 않은 로컬 환경에서는 조용히
  // 건너뛴다(paddleInstance가 계속 null이라 호출부의 업그레이드 버튼이 비활성 상태로
  // 남을 뿐). eventCallback은 initializePaddle 호출 시 한 번만 등록되므로 여기서 checkout
  // 완료/종료/에러에 따라 isCheckoutBusy를 되돌리고 UX용 토스트만 띄운다.
  useEffect(() => {
    const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!clientToken) return;

    initializePaddle({
      token: clientToken,
      environment: process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox",
      eventCallback: (event) => {
        if (
          event.name === CheckoutEventNames.CHECKOUT_COMPLETED ||
          event.name === CheckoutEventNames.CHECKOUT_CLOSED ||
          event.name === CheckoutEventNames.CHECKOUT_ERROR ||
          event.name === CheckoutEventNames.CHECKOUT_PAYMENT_ERROR
        ) {
          checkoutBusyRef.current = false;
          setIsCheckoutBusy(false);
        }

        if (event.name === CheckoutEventNames.CHECKOUT_COMPLETED) {
          // 같은 마운트에서 webhook 반영 전 다시 여는 것을 막는다. 다른 탭/기기는 아래
          // 서버 preflight의 DB + Paddle 원본 재검증으로 차단한다.
          checkoutCompletedRef.current = true;
          showToast(translate(localeRef.current, "settings.plan.checkoutCompleted"));
          onCheckoutCompletedRef.current?.();
        } else if (
          event.name === CheckoutEventNames.CHECKOUT_ERROR ||
          event.name === CheckoutEventNames.CHECKOUT_PAYMENT_ERROR
        ) {
          showToast(translate(localeRef.current, "settings.plan.checkoutError"), "error");
        }
      },
    }).then((instance) => {
      if (instance) setPaddleInstance(instance);
    });
  }, [showToast]);

  // 클릭 즉시 isCheckoutBusy를 true로 만들어 버튼을 비활성화한다 — Checkout.open() 자체는
  // 동기 호출이지만 오버레이가 실제로 뜨기까지 약간의 시간차가 있어, 그 사이 중복 호출하면
  // Checkout이 여러 번 열릴 수 있다. isCheckoutBusy는 checkout.loaded가 아니라
  // checkout.closed/completed/error에서만 풀어, 오버레이가 떠 있는 동안 계속 비활성 상태로
  // 둔다. userId가 없으면(비로그인) 아무 것도 하지 않는다 — 호출부가 로그인 여부를
  // 먼저 판단해야 한다(이 훅은 그 판단을 대신 해주지 않는다).
  async function openCheckout() {
    if (checkoutBusyRef.current || !paddleInstance || !userId) return;
    if (checkoutCompletedRef.current) {
      showToast(translate(locale, "settings.plan.existingSubscriptionCheckoutBlocked"), "error");
      return;
    }
    const priceId = getConfiguredPaddleProPriceId();
    if (!priceId) {
      showToast(translate(locale, "settings.plan.notConfigured"), "error");
      return;
    }

    checkoutBusyRef.current = true;
    setIsCheckoutBusy(true);
    let checkoutOpened = false;

    try {
      const response = await fetch("/api/paddle/checkout-eligibility", { method: "POST" });
      const contentType = response.headers.get("content-type") ?? "";

      if (!contentType.includes("application/json") || response.status === 401) {
        showToast(translate(locale, "common.sessionExpired"), "error");
        return;
      }

      const body = (await response.json()) as CheckoutEligibilityResponse;
      if (response.status === 409 && body.reason === "existing_subscription") {
        showToast(translate(locale, "settings.plan.existingSubscriptionCheckoutBlocked"), "error");
        return;
      }
      if (!response.ok || body.allowed !== true) {
        showToast(translate(locale, "settings.plan.checkoutError"), "error");
        return;
      }

      const checkoutCustomer = getCheckoutCustomer(body.paddleCustomerId ?? null, email);
      paddleInstance.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        // 로그인한 Supabase user.id를 그대로 실어 보낸다 — Paddle customer의 email 매칭이
        // 아니라 이 값을 기준으로 app/api/paddle/webhook이 paddle_customers/
        // paddle_subscriptions를 upsert한다(lib/paddle/processWebhook.ts).
        customData: { user_id: userId },
        // 서버 preflight가 방금 조회한 기존 customer id를 재사용한다. Paddle는 existing
        // customer id와 email을 동시에 받을 수 없으므로 첫 결제 사용자만 email을 prefill한다.
        ...(checkoutCustomer.customer ? { customer: checkoutCustomer.customer } : {}),
        settings: {
          variant: "one-page",
          locale,
          ...(checkoutCustomer.lockCustomer ? { allowLogout: false } : {}),
        },
      });
      checkoutOpened = true;
    } catch {
      showToast(translate(locale, "settings.plan.checkoutError"), "error");
    } finally {
      // Checkout이 열렸으면 closed/completed/error 이벤트가 잠금을 해제한다. 사전 검증이
      // 차단되거나 실패한 경우에만 여기서 즉시 다시 시도할 수 있게 푼다.
      if (!checkoutOpened) {
        checkoutBusyRef.current = false;
        setIsCheckoutBusy(false);
      }
    }
  }

  return {
    isReady: paddleInstance !== null,
    isCheckoutBusy,
    openCheckout,
  };
}
