export function getCheckoutCustomer(
  existingCustomerId: string | null,
  email: string
): { customer: { id: string } | { email: string } | undefined; lockCustomer: boolean } {
  if (existingCustomerId) {
    return { customer: { id: existingCustomerId }, lockCustomer: true };
  }
  if (email) {
    return { customer: { email }, lockCustomer: false };
  }
  return { customer: undefined, lockCustomer: false };
}

interface PortalCustomerRow {
  paddle_customer_id: string;
}

interface PortalSubscriptionRow {
  paddle_subscription_id: string;
  paddle_customer_id: string;
  status: string;
}

const PRO_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

// 입력 배열은 호출부에서 최신순으로 정렬한다. 유효한 구독이 있으면 그 구독의 실제
// customer를, 없으면 가장 최근 customer를 선택하고 그 customer 소유 구독만 Portal에
// 전달한다.
export function selectPortalCustomer(
  customerRows: PortalCustomerRow[],
  subscriptionRows: PortalSubscriptionRow[]
): { customerId: string; subscriptionIds: string[] } | null {
  if (customerRows.length === 0) return null;

  // 실제 Pro 권한이 있는 구독을 우선한다. paused는 Portal에서 재개할 수 있어 그 다음
  // 후보로만 사용한다. 예외적으로 여러 customer에 구독이 나뉜 상태에서도 최근 paused가
  // 다른 customer의 active 구독을 가리는 일을 막는다.
  const managedSubscription =
    subscriptionRows.find((row) => PRO_SUBSCRIPTION_STATUSES.has(row.status)) ??
    subscriptionRows.find((row) => row.status === "paused");
  const customerId =
    managedSubscription?.paddle_customer_id ?? customerRows[0].paddle_customer_id;

  return {
    customerId,
    subscriptionIds: subscriptionRows
      .filter((row) => row.paddle_customer_id === customerId)
      .map((row) => row.paddle_subscription_id),
  };
}
