import type { WorkflowStep } from "../../lib/corper-dashboard";

type RequestProgressStepperProps = {
  steps: WorkflowStep[];
};

function circleClass(state: WorkflowStep["state"]): string {
  if (state === "completed") return "bg-[#005129] text-white";
  if (state === "active") return "border-2 border-[#005129] bg-[#9ff5b7] text-[#005129]";
  return "bg-[#e5e9e2] text-[#6f7a70]";
}

function titleClass(state: WorkflowStep["state"]): string {
  if (state === "completed" || state === "active") return "text-[#181d19]";
  return "text-[#6f7a70]";
}

export function RequestProgressStepper({ steps }: RequestProgressStepperProps) {
  return (
    <div className="rounded-lg border border-[#bfc9be] bg-white p-6 sm:p-8">
      <h2 className="mb-6 text-base font-semibold text-[#181d19] sm:mb-8">Request progress</h2>
      <div className="relative flex flex-col gap-6 md:flex-row md:justify-between md:gap-4">
        <div className="absolute top-6 right-[10%] left-[10%] hidden h-0.5 bg-[#bfc9be] md:block" aria-hidden />
        {steps.map((step) => (
          <div
            key={step.id}
            className="relative z-10 flex flex-1 items-center gap-4 md:flex-col md:gap-3 md:text-center"
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold ${circleClass(step.state)}`}
            >
              {step.order}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className={`text-sm font-medium ${titleClass(step.state)}`}>{step.title}</span>
              <span
                className={`text-xs ${step.state === "active" ? "font-medium text-[#005129]" : "text-[#6f7a70]"}`}
              >
                {step.subtitle}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
