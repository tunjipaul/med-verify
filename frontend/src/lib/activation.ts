import { api } from "./api";

type RequestOtpResponse = {
  success: boolean;
  message: string;
  data: {
    expiresInSeconds: number;
    maskedPhone: string;
    devOtp?: string;
  };
};

type VerifyOtpResponse = {
  success: boolean;
  message: string;
  data: {
    token: string;
    csrfToken?: string;
    user: {
      id: string;
      email: string;
      role: string;
      firstName?: string | null;
      lastName?: string | null;
    };
  };
};

export async function requestCorperActivationOtp(payload: { callUpNumber: string; nin: string }) {
  const { data } = await api.post<RequestOtpResponse>("/corper/activation/request-otp", payload);
  return data;
}

export async function verifyCorperActivationOtp(payload: { callUpNumber: string; otp: string }) {
  const { data } = await api.post<VerifyOtpResponse>("/corper/activation/verify-otp", payload);
  return data;
}
