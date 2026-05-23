import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Bell,
  Building2,
  ChevronDown,
  CircleHelp,
  FileKey2,
  LogOut,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { RequestProgressStepper } from "../components/corper/RequestProgressStepper";
import { VerificationCodeDialog } from "../components/corper/VerificationCodeDialog";
import {
  buildWorkflowSteps,
  displayCorperName,
  formatCaseRef,
  getStatusLabel,
  getStatusTone,
} from "../lib/corper-dashboard";
import { listCorperMctCases, pickActiveCase, type MctStatus } from "../lib/mct";
import { useAuthStore } from "../store/auth.store";

function statusChipClass(tone: ReturnType<typeof getStatusTone>): string {
  const base = "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase";
  switch (tone) {
    case "success":
      return `${base} border-[#00714d] bg-[#6cf8bb]/40 text-[#005129]`;
    case "warning":
      return `${base} border-[#b45309] bg-amber-50 text-amber-800`;
    case "danger":
      return `${base} border-[#ba1a1a] bg-[#ffdad6] text-[#93000a]`;
    case "info":
      return `${base} border-[#005129] bg-[#f1f5ee] text-[#005129]`;
    default:
      return `${base} border-[#bfc9be] bg-[#e5e9e2] text-[#6f7a70]`;
  }
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [verifyOpen, setVerifyOpen] = useState(false);

  const casesQuery = useQuery({
    queryKey: ["corper-mct-cases"],
    queryFn: listCorperMctCases,
  });

  const activeCase = useMemo(
    () => pickActiveCase(casesQuery.data?.items ?? []),
    [casesQuery.data?.items],
  );

  const workflowSteps = useMemo(() => buildWorkflowSteps(activeCase), [activeCase]);
  const displayName = user ? displayCorperName(user) : "Corper";

  function handleLogout() {
    clearAuth();
    navigate("/corper/login");
  }

  function scrollToCaseStatus() {
    document.getElementById("case-status-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const identityVerified = true;
  const medicalProfilePending = !activeCase || activeCase.status === "CREATED";

  return (
    <div className="min-h-screen bg-[#f7fbf3] text-[#181d19]">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[#bfc9be] bg-white px-4 sm:h-16 sm:px-8">
        <div className="flex items-center gap-3">
          <img src="/nysc-logo.svg" alt="NYSC" className="h-8 w-8 object-contain" />
          <span className="text-base font-bold text-[#005129] sm:text-lg">NYSC MedVerify</span>
        </div>
        <div className="hidden max-w-md flex-1 px-8 md:block">
          <div className="relative">
            <input
              type="search"
              disabled
              placeholder="Hospital search (coming soon)"
              className="w-full rounded-full border border-[#bfc9be] bg-[#f1f5ee] py-2 pr-4 pl-10 text-sm text-[#6f7a70]"
            />
            <Building2 className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#6f7a70]" />
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="rounded-full p-2 text-[#6f7a70] hover:bg-[#f1f5ee]"
            title="Notifications (coming soon)"
          >
            <Bell className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full p-2 text-[#6f7a70] hover:bg-[#f1f5ee]"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#bfc9be] bg-[#0b6b3a] text-xs font-bold text-white">
            {displayName.charAt(0)}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 sm:py-10">
        <section className="mb-8 sm:mb-12">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#005129] sm:text-3xl">
              Welcome, {displayName.split(" ")[0]}.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#3f4940] sm:text-base">
              Visit an accredited hospital for your medical report, then enter the MCT or verification details your
              doctor gives you to link your case and track NYSC review outcomes.
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-6">
          <div className="space-y-6 lg:col-span-8">
            <RequestProgressStepper steps={workflowSteps} />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex items-start gap-4 rounded-lg border border-[#bfc9be] bg-white p-6">
                <div className="rounded-lg bg-[#6cf8bb] p-3">
                  <ShieldCheck className="h-6 w-6 text-[#00714d]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-base font-semibold">NIN verified</h3>
                    <span className={statusChipClass(identityVerified ? "success" : "neutral")}>Verified</span>
                  </div>
                  <p className="text-sm text-[#3f4940]">
                    Portal activation matched your call-up number and NIN with NYSC records.
                  </p>
                </div>
              </div>

              <div
                className={`flex items-start gap-4 rounded-lg border border-[#bfc9be] bg-white p-6 ${medicalProfilePending ? "" : "opacity-90"}`}
              >
                <div className="rounded-lg bg-[#e5e9e2] p-3">
                  <Activity className="h-6 w-6 text-[#6f7a70]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-base font-semibold">Medical case</h3>
                    <span className={statusChipClass(activeCase ? getStatusTone(activeCase.status) : "neutral")}>
                      {activeCase ? getStatusLabel(activeCase.status) : "No case yet"}
                    </span>
                  </div>
                  <p className="text-sm text-[#3f4940]">
                    {activeCase
                      ? "Your case is on record. Complete your hospital visit and enter the token or code from your doctor."
                      : "No case linked yet. After your hospital visit, enter the MCT reference your doctor provides."}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => toast.info("Approved hospital directory is coming soon.")}
                className="rounded-lg border border-[#bfc9be] bg-white p-6 text-left transition hover:border-[#005129]"
              >
                <Building2 className="mb-4 h-8 w-8 text-[#005129]" />
                <h4 className="text-sm font-semibold">Find approved hospital</h4>
                <p className="mt-1 text-xs text-[#6f7a70]">Tier 1 and Tier 2 accredited facilities.</p>
              </button>
              <button
                type="button"
                onClick={() => setVerifyOpen(true)}
                className="rounded-lg border border-[#bfc9be] bg-white p-6 text-left transition hover:border-[#005129]"
              >
                <FileKey2 className="mb-4 h-8 w-8 text-[#005129]" />
                <h4 className="text-sm font-semibold">Enter verification code</h4>
                <p className="mt-1 text-xs text-[#6f7a70]">Doctor-issued MV- code (12-hour validity).</p>
              </button>
              <button
                type="button"
                onClick={scrollToCaseStatus}
                className="rounded-lg border border-[#bfc9be] bg-white p-6 text-left transition hover:border-[#005129]"
              >
                <Upload className="mb-4 h-8 w-8 text-[#005129]" />
                <h4 className="text-sm font-semibold">Track case status</h4>
                <p className="mt-1 text-xs text-[#6f7a70]">View lifecycle stage and decision updates.</p>
              </button>
            </div>

            <div
              id="case-status-panel"
              className="relative overflow-hidden rounded-xl border border-[#005129]/15 bg-[#005129]/5 p-6 sm:p-8"
            >
              <h3 className="mb-3 text-base font-semibold text-[#005129]">Active case overview</h3>
              {casesQuery.isLoading ? (
                <p className="text-sm text-[#3f4940]">Loading your case…</p>
              ) : casesQuery.isError ? (
                <p className="text-sm text-[#93000a]">Could not load case data. Refresh to try again.</p>
              ) : activeCase ? (
                <div className="space-y-4">
                  <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div className="flex justify-between gap-4 border-b border-[#bfc9be]/60 py-2 sm:flex-col sm:items-start">
                      <dt className="text-[#6f7a70]">Case reference</dt>
                      <dd className="font-mono font-semibold text-[#181d19]">{formatCaseRef(activeCase.id)}</dd>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-[#bfc9be]/60 py-2 sm:flex-col sm:items-start">
                      <dt className="text-[#6f7a70]">Status</dt>
                      <dd>
                        <span className={statusChipClass(getStatusTone(activeCase.status))}>
                          {getStatusLabel(activeCase.status as MctStatus)}
                        </span>
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-[#bfc9be]/60 py-2 sm:flex-col sm:items-start">
                      <dt className="text-[#6f7a70]">Risk score</dt>
                      <dd className="font-semibold">{activeCase.riskScore}</dd>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-[#bfc9be]/60 py-2 sm:flex-col sm:items-start">
                      <dt className="text-[#6f7a70]">Referral tagged</dt>
                      <dd className="font-semibold">{activeCase.referralTag ? "Yes" : "No"}</dd>
                    </div>
                  </dl>
                  <p className="max-w-2xl text-sm leading-relaxed text-[#3f4940]">
                    After your doctor submits the report, enter the one-time verification code to link the hospital
                    submission to your case. NYSC will route the case through review, escalation, or final decision
                    with explainable outcomes.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-[#3f4940]">
                  No case is linked to your account yet. Visit an accredited hospital; your doctor will give you an MCT
                  reference and verification code to enter here.
                </p>
              )}
            </div>

            <div className="relative overflow-hidden rounded-xl border border-[#005129]/10 bg-[#005129]/5 p-6 sm:p-8">
              <h3 className="mb-3 text-base font-semibold text-[#005129]">What you should know</h3>
              <p className="mb-4 max-w-2xl text-sm leading-relaxed text-[#3f4940]">
                Medical relocation is reviewed digitally. Your case (MCT) is system-managed — you cannot self-issue
                reports. Verification codes are separate one-time tokens generated by your doctor after report
                submission.
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-lg border border-white bg-white/60 px-3 py-2 text-xs font-medium">
                  <ShieldCheck className="h-4 w-4 text-[#005129]" />
                  Secured data
                </span>
                <span className="inline-flex items-center gap-2 rounded-lg border border-white bg-white/60 px-3 py-2 text-xs font-medium">
                  <ShieldCheck className="h-4 w-4 text-[#005129]" />
                  Full audit trail
                </span>
              </div>
            </div>
          </div>

          <aside className="space-y-6 lg:col-span-4">
            <div className="rounded-lg border border-[#bfc9be] bg-[#e5e9e2] p-6">
              <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
                <CircleHelp className="h-5 w-5 text-[#005129]" />
                Common questions
              </h3>
              <div className="space-y-4">
                <details className="group border-b border-[#bfc9be] pb-4" open>
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-[#3f4940]">
                    What is an MCT?
                    <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-[#6f7a70]">
                    <strong>Medical Case Token (MCT)</strong> is your official case record in MedVerify — one active
                    case per corper. It tracks hospital, doctor report, risk review, and final NYSC decision.
                  </p>
                </details>
                <details className="group border-b border-[#bfc9be] pb-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-[#3f4940]">
                    What is the verification code?
                    <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-[#6f7a70]">
                    After your doctor submits a report, the hospital system issues a one-time <span className="font-mono">MV-</span>{" "}
                    code. Enter it here within 12 hours to validate the submission. It is not your call-up number.
                  </p>
                </details>
                <details className="group border-b border-[#bfc9be] pb-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-[#3f4940]">
                    How long does review take?
                    <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-[#6f7a70]">
                    After code validation, cases move through automated risk checks and human review where required.
                    You will see status updates on this dashboard.
                  </p>
                </details>
              </div>
              <div className="mt-6 rounded-lg bg-[#005129] p-4 text-center text-white">
                <h4 className="text-sm font-semibold">Need help?</h4>
                <p className="mt-1 text-xs opacity-90">Contact your NYSC state coordinator for relocation support.</p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <footer className="border-t border-[#bfc9be] bg-[#f1f5ee] px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 md:flex-row">
          <div className="text-center md:text-left">
            <p className="text-sm font-semibold text-[#3f4940]">NYSC MedVerify</p>
            <p className="text-xs text-[#6f7a70]">© {new Date().getFullYear()} National Youth Service Corps</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-[#6f7a70]">
            <span>Privacy policy</span>
            <span>Security standards</span>
            <span>Relocation guidelines</span>
          </div>
        </div>
      </footer>

      <VerificationCodeDialog
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        onSuccess={() => void queryClient.invalidateQueries({ queryKey: ["corper-mct-cases"] })}
      />
    </div>
  );
}
