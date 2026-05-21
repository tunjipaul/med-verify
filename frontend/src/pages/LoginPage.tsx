import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { NigeriaMapBackground } from "../components/NigeriaMapBackground";
import { requestCorperActivationOtp, verifyCorperActivationOtp } from "../lib/activation";
import { useAuthStore } from "../store/auth.store";

const showDevOtpPanel = import.meta.env.DEV;

const inputClassName =
  "w-full min-w-0 rounded-md border border-[#2a5b5c] bg-[#0a1f25] px-3 py-2.5 text-sm text-[#ebfffa] placeholder:text-[#6f9791] outline-none transition focus:border-[#0b8f69] focus:ring-2 focus:ring-[#0b8f69]/30 sm:px-4 sm:py-3";

const labelClassName = "text-xs font-bold tracking-[0.12em] text-[#98d8cc] uppercase";

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  async function handleSendOtp(callUpNumber: string, nin: string) {
    setIsSendingOtp(true);
    try {
      const result = await requestCorperActivationOtp({ callUpNumber, nin });
      setMaskedPhone(result.data.maskedPhone);
      setDevOtp(result.data.devOtp ?? null);
      toast.success(result.message);
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message ?? "Could not send OTP. Check your call-up number and NIN.");
      setDevOtp(null);
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function handleActivationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const callUpNumber = String(form.get("callup") ?? "");
    const otp = String(form.get("otp") ?? "").replace(/\D/g, "");

    if (otp.length !== 6) {
      toast.error("Enter the 6-digit OTP from your phone.");
      return;
    }

    setIsVerifying(true);
    try {
      const verified = await verifyCorperActivationOtp({ callUpNumber, otp });
      if (verified.data.csrfToken) {
        localStorage.setItem("csrf_token", verified.data.csrfToken);
      }
      setAuth({
        token: verified.data.token,
        user: verified.data.user,
      });
      toast.success("Account verified. Access granted.");
      navigate("/corper/dashboard");
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message ?? "Activation failed. Check your details and OTP.");
    } finally {
      setIsVerifying(false);
    }
  }

  function handleSendOtpClick() {
    const form = document.getElementById("activation-form") as HTMLFormElement | null;
    if (!form) return;
    const formData = new FormData(form);
    const callUpNumber = String(formData.get("callup") ?? "");
    const nin = String(formData.get("nin") ?? "");
    if (!callUpNumber || !nin) {
      toast.error("Enter call-up number and NIN first.");
      return;
    }
    void handleSendOtp(callUpNumber, nin);
  }

  return (
    <div className="relative h-screen overflow-hidden bg-[#07161c] text-[#e6f4f1]">
      <NigeriaMapBackground variant="dark" mapOpacity={0.2} className="z-[1]" />
      <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(rgba(37,94,89,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(37,94,89,0.16)_1px,transparent_1px)] bg-[size:40px_40px] sm:bg-[size:56px_56px]" />
      <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_50%_30%,rgba(16,136,113,0.28),transparent_55%)]" />

      <main className="relative z-10 flex h-full items-center justify-center overflow-hidden px-4 py-4 pointer-events-none sm:px-6 sm:py-6">
        <section className="mx-auto flex w-full max-w-md min-h-0 max-h-full flex-col sm:max-w-lg">
          <div className="mb-3 shrink-0 text-center sm:mb-4">
            <div className="mb-2 flex justify-center sm:mb-3">
              <img
                src="/nysc-logo.svg"
                alt="NYSC Seal"
                className="h-14 w-14 object-contain drop-shadow-[0_4px_16px_rgba(16,136,113,0.35)] sm:h-20 sm:w-20"
              />
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-[#ebfffa] sm:text-2xl">Portal Activation</h1>
            <p className="mx-auto mt-1 max-w-[340px] text-xs leading-snug text-[#a6c9c3] sm:mt-2 sm:text-sm">
              Verify your identity to access the Medical Relocation application unit.
            </p>
          </div>

          <div className="pointer-events-auto min-h-0 shrink rounded-xl border border-[#2a5b5c] bg-[#071a1f]/90 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-6 md:p-7">
            <form className="space-y-3.5 sm:space-y-5" onSubmit={handleActivationSubmit} id="activation-form">
                <div className="space-y-2">
                  <label htmlFor="callup" className={labelClassName}>
                    Call-Up Number
                  </label>
                  <input
                    id="callup"
                    name="callup"
                    required
                    autoComplete="off"
                    placeholder="NYSC/LAG/2026/000001"
                    className={inputClassName}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="nin" className={labelClassName}>
                    National Identification Number (NIN)
                  </label>
                  <input
                    id="nin"
                    name="nin"
                    required
                    maxLength={11}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="11-digit number"
                    className={inputClassName}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="otp" className={labelClassName}>
                    One-Time Password (OTP)
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                    <input
                      id="otp"
                      name="otp"
                      required
                      maxLength={6}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="6-digit code"
                      className={inputClassName}
                    />
                    <button
                      type="button"
                      disabled={isSendingOtp}
                      onClick={handleSendOtpClick}
                      className="inline-flex min-h-[46px] w-full shrink-0 items-center justify-center rounded-md border border-[#6f9791] px-4 py-3 text-xs font-bold tracking-[0.12em] text-[#d7ebe7] uppercase transition hover:border-[#80b7ae] hover:text-white disabled:opacity-50 sm:w-auto sm:min-w-[7.5rem]"
                    >
                      {isSendingOtp ? "Sending…" : "Send OTP"}
                    </button>
                  </div>
                  {maskedPhone ? (
                    <p className="text-xs text-[#7fdccb]">Code sent to {maskedPhone}</p>
                  ) : null}
                </div>

                {showDevOtpPanel && devOtp ? (
                  <div className="rounded-md border border-amber-500/50 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
                    <p className="text-[10px] font-bold tracking-wide text-amber-200 uppercase">Dev OTP</p>
                    <p className="font-mono text-base tracking-widest text-amber-50">{devOtp}</p>
                  </div>
                ) : null}

                <div className="rounded border-l-4 border-[#0b8f69] bg-[#0a2f2a]/80 p-2.5 text-[11px] leading-snug text-[#a6c9c3] sm:p-3 sm:text-xs">
                  <strong className="text-[#d7ebe7]">Official Verification:</strong> Secure government terminal.
                  Continuing authorizes identity cross-referencing.
                </div>

                <button
                  type="submit"
                  disabled={isVerifying || isSendingOtp}
                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-sm border border-[#118664] bg-[#0b8f69] px-4 py-2.5 text-sm font-semibold tracking-[0.04em] text-white transition hover:bg-[#0a7a5b] disabled:opacity-60 sm:min-h-[48px] sm:py-3"
                >
                  {isVerifying ? "Verifying…" : "Verify & Activate Account"}
                </button>
              </form>
            </div>
          </section>
      </main>
    </div>
  );
}
