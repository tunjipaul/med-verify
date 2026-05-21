import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { NigeriaMapBackground } from "../components/NigeriaMapBackground";

const trustCards = [
  {
    title: "Verified Hospitals",
    body: "Only accredited institutions can issue relocation reports.",
  },
  {
    title: "Identity Validation",
    body: "Every request is tied to verified national identity systems.",
  },
  {
    title: "Centralized Oversight",
    body: "All relocation decisions are monitored through NYSC HQ.",
  },
];

const flowNodes = [
  { label: "Corper", x: 90, y: 330 },
  { label: "Hospital", x: 220, y: 240 },
  { label: "Doctor Verification", x: 390, y: 190 },
  { label: "Risk Engine", x: 560, y: 250 },
  { label: "NYSC HQ", x: 690, y: 360 },
  { label: "DG Approval", x: 820, y: 290 },
];

export default function LandingPage() {
  return (
    <div className="h-screen overflow-hidden bg-[#07161c] text-[#e6f4f1]">
      <nav className="h-16 border-b border-[#1f4f4c] bg-[#0a2f2a]/95">
        <div className="mx-auto flex h-full w-full max-w-[1400px] items-center justify-between px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/nysc-logo.svg" alt="NYSC crest" className="h-8 w-8 object-contain" />
            <ShieldCheck className="h-4 w-4 text-[#6ad3bf]" />
            <div className="min-w-0">
              <p className="font-mono text-[10px] leading-3 tracking-[0.18em] text-[#98d8cc] uppercase">NYSC Infrastructure</p>
              <p className="truncate font-mono text-[12px] font-semibold tracking-[0.16em] text-white uppercase">MEDVERIFY</p>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-5">
            <a href="#verify" className="hidden font-mono text-[10px] tracking-[0.14em] text-white/80 uppercase md:inline">
              Verify Status
            </a>
            <a href="#hospital" className="hidden font-mono text-[10px] tracking-[0.14em] text-white/80 uppercase md:inline">
              Hospital Access
            </a>
            <a href="#activate" className="hidden font-mono text-[10px] tracking-[0.14em] text-white/80 uppercase md:inline">
              Activate Access
            </a>
            <Link
              to="/corper/login"
              className="rounded-sm border border-[#8edccf]/55 bg-white px-2.5 py-2 font-mono text-[9px] font-semibold tracking-[0.14em] text-[#0b3a32] uppercase transition hover:bg-[#daf6ef] md:px-3 md:text-[10px]"
            >
              Secure Login
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative h-[calc(100vh-64px)]">
        <NigeriaMapBackground variant="dark" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(37,94,89,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(37,94,89,0.16)_1px,transparent_1px)] bg-[size:56px_56px]" />

        <section className="relative mx-auto grid h-[calc(100%-128px)] w-full max-w-[1400px] grid-cols-1 gap-4 px-4 py-3 md:px-8 lg:grid-cols-[0.47fr_0.53fr] lg:gap-8 lg:py-4">
          <div className="flex flex-col justify-center">
            <p className="mb-4 font-mono text-[11px] tracking-[0.13em] text-[#7fdccb] uppercase">
              MEDVERIFY • National Medical Verification Infrastructure
            </p>
            <h1 className="max-w-[740px] font-sans text-[clamp(1.55rem,3.2vw,3.35rem)] leading-[1.04] font-semibold tracking-[-0.02em] text-[#ebfffa]">
              A National Infrastructure for Trusted Medical Relocation Verification
            </h1>
            <p className="mt-4 max-w-[680px] text-[13px] leading-6 text-[#a6c9c3] md:text-[14px] lg:text-[15px] lg:leading-7">
              The NYSC Medical Verification System digitally authenticates relocation requests through accredited
              hospitals, verified doctors, identity validation, and centralized oversight.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 lg:mt-8">
              <Link
                to="/corper/login"
                className="inline-flex items-center gap-2 rounded-sm border border-[#118664] bg-[#0b8f69] px-4 py-2.5 font-mono text-[10px] font-semibold tracking-[0.12em] uppercase transition hover:bg-[#0a7a5b] lg:px-5 lg:py-3 lg:text-[11px]"
              >
                Activate Access
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center rounded-sm border border-[#6f9791] px-4 py-2.5 font-mono text-[10px] font-semibold tracking-[0.12em] text-[#d7ebe7] uppercase transition hover:border-[#80b7ae] lg:px-5 lg:py-3 lg:text-[11px]"
              >
                Learn How Verification Works
              </a>
            </div>
          </div>

          <div className="relative min-h-[240px] overflow-hidden rounded-xl border border-[#2a5b5c] bg-[#071a1f]/85 md:min-h-[300px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_62%_45%,rgba(38,177,150,0.2),transparent_50%)]" />
            <svg viewBox="0 0 920 520" className="relative h-full w-full">
              <defs>
                <filter id="nodeGlow">
                  <feGaussianBlur stdDeviation="2.4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <g opacity="0.22" stroke="#1d5856" strokeWidth="1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <line key={`h-${i}`} x1="0" y1={40 + i * 40} x2="920" y2={40 + i * 40} />
                ))}
                {Array.from({ length: 18 }).map((_, i) => (
                  <line key={`v-${i}`} x1={20 + i * 50} y1="0" x2={20 + i * 50} y2="520" />
                ))}
              </g>

              {flowNodes.slice(0, -1).map((node, idx) => {
                const next = flowNodes[idx + 1];
                return (
                  <g key={`${node.label}-${next.label}`}>
                    <line x1={node.x} y1={node.y} x2={next.x} y2={next.y} stroke="#5ab9aa" strokeOpacity="0.48" strokeWidth="1.6" />
                    <circle className="flow-pulse" cx={node.x + (next.x - node.x) * 0.5} cy={node.y + (next.y - node.y) * 0.5} r="3.4" fill="#7ef1dc" />
                  </g>
                );
              })}

              {flowNodes.map((node) => (
                <g key={node.label} transform={`translate(${node.x},${node.y})`}>
                  <circle r="7.5" fill="#8af3e1" filter="url(#nodeGlow)" />
                  <circle r="18" fill="none" stroke="#4ecdb7" strokeOpacity="0.4" />
                  <text x="12" y="-12" fill="#b8ece4" fontSize="10" fontWeight="700" letterSpacing="0.08em">
                    {node.label}
                  </text>
                </g>
              ))}

              <g transform="translate(620,36)" className="hidden md:block">
                <rect width="268" height="108" rx="10" fill="#08252d" fillOpacity="0.86" stroke="#2f6c74" />
                <text x="14" y="24" fill="#94d9cf" fontSize="10" letterSpacing="0.08em">
                  LIVE VERIFICATION NETWORK
                </text>
                <text x="14" y="48" fill="#dcfff8" fontSize="15" fontWeight="700">
                  Secure Processing Active
                </text>
                <text x="14" y="72" fill="#83b9b0" fontSize="11">
                  Identity checks, medical validation,
                </text>
                <text x="14" y="88" fill="#83b9b0" fontSize="11">
                  and centralized approval monitoring.
                </text>
              </g>
            </svg>
          </div>
        </section>

        <section className="relative mx-auto h-[128px] w-full max-w-[1400px] px-4 pb-3 md:px-8">
          <div className="flex h-full gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
          {trustCards.map((card) => (
            <article
              key={card.title}
              className="group min-w-[260px] flex-1 rounded-lg border border-[#2a5d5e] bg-[#0a1f25]/88 p-3 transition hover:border-[#4e9f9c] hover:shadow-[0_0_22px_rgba(53,150,140,0.22)] lg:min-w-0 lg:p-4"
            >
              <h3 className="font-mono text-[10px] font-semibold tracking-[0.12em] text-[#d8f5ef] uppercase lg:text-[11px]">
                {card.title}
              </h3>
              <p className="mt-2 text-[12px] leading-4 text-[#9dbdb7] lg:text-[13px] lg:leading-5">{card.body}</p>
            </article>
          ))}
          </div>
        </section>
      </main>

      <style>{`
        .flow-pulse {
          animation: flowPulse 2.4s ease-in-out infinite;
        }
        @keyframes flowPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.25); }
        }
      `}</style>
    </div>
  );
}
