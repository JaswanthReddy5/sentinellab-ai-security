import Link from "next/link";
import {
  ShieldAlert,
  ArrowRight,
  FileText,
  ShieldCheck,
  FlaskConical,
  GitCompareArrows,
  Workflow,
  Swords,
  Crosshair,
  TriangleAlert,
} from "lucide-react";
import { buildDashboardSummary } from "@/lib/dashboardData";

// The landing page shows live scorecard numbers from the data store, which
// can change at runtime (e.g. after a demo visitor runs a security test) —
// it must not be frozen into the static build output.
export const dynamic = "force-dynamic";

const ARCHITECTURE_STEPS = [
  { icon: ShieldCheck, label: "Policy", description: "Define rules as YAML/JSON — PII, secrets, injection, tool restrictions." },
  { icon: FlaskConical, label: "Test Generation", description: "Positive, negative, and boundary tests generated automatically." },
  { icon: Swords, label: "Attack Mutation", description: "12 adversarial transformations applied to seed attacks." },
  { icon: Crosshair, label: "Policy Evaluation", description: "Deterministic rule-based engine returns ALLOW / BLOCK / REVIEW." },
  { icon: GitCompareArrows, label: "Regression Detection", description: "Compare versions, surface new bypasses and weakened categories." },
  { icon: Workflow, label: "CI/CD Gate", description: "Fail the pull request when coverage regresses below threshold." },
];

export default async function LandingPage() {
  const summary = await buildDashboardSummary();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border-soft px-6 py-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-accent" size={20} />
          <span className="text-sm font-semibold tracking-tight">SentinelLab</span>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-muted sm:flex">
          <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
          <Link href="/ci" className="hover:text-foreground">CI/CD</Link>
          <Link href="/reports" className="hover:text-foreground">Reports</Link>
        </nav>
        <Link href="/dashboard" className="rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-accent-strong">
          Launch Demo
        </Link>
      </header>

      <main className="flex-1">
        <section className="card-grid-fade relative overflow-hidden border-b border-border-soft px-6 py-20 text-center">
          <div className="mx-auto max-w-3xl">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              GitHub Actions for AI Security Policies
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Test Your AI Security Before Attackers Do.</h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted">
              Continuously evaluate AI security policies against evolving attacks, policy changes, and false positives — with automatic test
              generation, regression detection, and a CI/CD gate.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/dashboard" className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-black hover:bg-accent-strong">
                Run Demo <ArrowRight size={14} />
              </Link>
              <Link
                href="/reports"
                className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-5 py-2.5 text-sm font-semibold text-foreground hover:border-accent/40"
              >
                <FileText size={14} /> View Security Report
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-muted-2">Product Architecture</h2>
          <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-muted">
            Policy → automatic test generation → adversarial + benign test suite → policy evaluation → expected vs. actual → regression detection →
            security metrics → remediation recommendations.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {ARCHITECTURE_STEPS.map((step, i) => (
              <div key={step.label} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface/60 p-4 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <step.icon size={18} />
                </div>
                <span className="text-xs font-semibold text-foreground">
                  {i + 1}. {step.label}
                </span>
                <span className="text-[11px] leading-snug text-muted">{step.description}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border-soft bg-surface/30 px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-1 text-center text-xs font-semibold uppercase tracking-widest text-muted-2">Live Demo Scorecard</h2>
            <p className="mb-8 text-center text-sm text-muted">Real numbers, computed live by the deterministic engine — not fabricated.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ScoreTile label="Security Coverage" value={`${summary.securityCoverage}%`} />
              <ScoreTile label="Attack Detection" value={`${summary.attackDetection.blocked}/${summary.attackDetection.total}`} />
              <ScoreTile label="False Positive Rate" value={`${summary.falsePositiveRate}%`} />
              <ScoreTile label="Critical Bypasses" value={String(summary.criticalBypasses)} accent="danger" />
            </div>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-2">
              <TriangleAlert size={12} /> Prototype Security Evaluation — an internal regression score, not a certified security audit.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="mb-3 text-lg font-semibold text-foreground">An independent prototype</h2>
          <p className="text-sm leading-relaxed text-muted">
            SentinelLab is an independent AI security testing and policy regression prototype. It is not affiliated with or endorsed by any
            third-party AI security company. It demonstrates a security testing layer that could complement enterprise AI security platforms —
            built to show the regression-testing methodology end-to-end, from policy to CI/CD gate.
          </p>
        </section>
      </main>

      <footer className="border-t border-border-soft px-6 py-6 text-center text-xs text-muted-2">
        SentinelLab — AI Security Regression Lab. Independent prototype, not affiliated with any AI security vendor.
      </footer>
    </div>
  );
}

function ScoreTile({ label, value, accent }: { label: string; value: string; accent?: "danger" }) {
  return (
    <div className="rounded-xl border border-border bg-surface/60 p-4 text-center">
      <div className={`text-2xl font-semibold ${accent === "danger" ? "text-danger" : "text-foreground"}`}>{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-2">{label}</div>
    </div>
  );
}
