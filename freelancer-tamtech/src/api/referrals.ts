import api from "./client";

export interface ReferralPayload {
  referrer_name: string;
  referrer_phone: string;
  customer_name: string;
  customer_phone: string;
  bike_model?: string;
  referral_code?: string;
}

export interface ReferralResponse {
  ok: boolean;
  message?: string;
  referral_code?: string;
}

export async function submitReferral(
  data: ReferralPayload
): Promise<ReferralResponse> {
  const res = await api.post<ReferralResponse>("/referrals", data);
  if (!res.data || res.data.ok === false) {
    throw new Error(res.data?.message || "Referral submission failed.");
  }
  return res.data;
}
