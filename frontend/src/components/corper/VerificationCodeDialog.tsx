import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { validateVerificationCode } from "../../lib/mct";

type VerificationCodeDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function VerificationCodeDialog({ open, onClose, onSuccess }: VerificationCodeDialogProps) {
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length < 3) {
      toast.error("Enter the verification code from your doctor.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await validateVerificationCode(trimmed);
      toast.success(result.message ?? "Verification code accepted.");
      setCode("");
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message ?? "Invalid or expired verification code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#181d19]/50 p-4">
      <div
        className="w-full max-w-md rounded-lg border border-[#bfc9be] bg-white p-6 shadow-lg"
        role="dialog"
        aria-labelledby="verify-code-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="verify-code-title" className="text-base font-semibold text-[#181d19]">
              Enter verification code
            </h2>
            <p className="mt-1 text-sm text-[#3f4940]">
              Use the <span className="font-mono">MV-</span> code issued by your doctor after your medical report is
              submitted.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#6f7a70] hover:bg-[#f1f5ee]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="verification-code" className="mb-1 block text-sm font-medium text-[#3f4940]">
              Verification code
            </label>
            <input
              id="verification-code"
              name="verification-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="MV-12345678"
              autoComplete="off"
              className="w-full rounded border border-[#bfc9be] bg-white px-3 py-2.5 font-mono text-sm text-[#181d19] outline-none focus:border-[#005129] focus:ring-2 focus:ring-[#005129]/20"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded border border-[#bfc9be] px-4 py-2.5 text-sm font-medium text-[#3f4940] hover:bg-[#f1f5ee]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded bg-[#005129] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0b6b3a] disabled:opacity-60"
            >
              {isSubmitting ? "Validating…" : "Validate code"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
