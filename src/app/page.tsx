import Link from "next/link";
import {
  ShieldAlert,
  ArrowRight,
  Swords,
  ShieldCheck,
  FlaskConical,
  Crosshair,
  GitCompareArrows,
  Search,
  Wrench,
  Workflow,
  TriangleAlert,
} from "lucide-react";
import { buildDashboardSummary } from "@/lib/dashboardData";
import { getStore } from "@/lib/data/store";
import { pickTopBypass } from "@/lib/engine/regression";
import { RunRegressionDemo, type RegressionDemoData } from "@/components/home/RunRegressionDemo";

// The landing page shows live scorecard numbers from the data store, which
// can change at runtime (e.g. after a demo visitor runs a security test) —
// it must not be frozen into the static build output.
export const dynamic = "force-dynamic";

const LIFECYCLE_STEPS = [
  { icon: ShieldCheck, label: "Policy Change" },
  { icon: FlaskConical, label: "Generate Tests" },
  { icon: Crosshair, label: "Run Security Evaluation" },
  { icon: GitCompareArrows, label: "Compare Versions" },
  { icon: TriangleAlert, label: "Detect Regression" },
  { icon: Search, label: "Investigate Bypass" },
  { icon: Wrench, label: "Recommend Mitigation" },
  { icon: Workflow, label: "CI/CD Gate" },
];

const ARCHITECTURE_STEPS = [
  { icon: ShieldCheck, label: "Policy", description: "Define rules as YAML/JSON — PII, secrets, injection, tool restrictions." },
  { icon: FlaskConical, label: "Test Generation", description: "Positive, negative, and boundary tests generated automatically." },
  { icon: Swords, label: "Attack Mutation", description: "12 adversarial transformations applied to seed attacks." },
  { icon: Crosshair, label: "Policy Evaluation", description: "Deterministic rule-based engine returns ALLOW / BLOCK / REVIEW." },
  { icon: GitCompareArrows, label: "Regression Detection", description: "Compare versions, surface new bypasses and weakened categories." },
  { icon: Workflow, label: "CI/CD Gate", description: "Fail the pull request when coverage regresses below threshold." },
];

async function buildRegressionDemoData(): Promise<RegressionDemoData | null> {
  const store = getStore();
  const regressions = await store.listRegressions();
  const demo = regressions.find((r) => r.isRegression) ?? regressions[0];
  if (!demo) return null;

  const [baselineRun, currentRun, baselineResults, currentResults] = await Promise.all([
    store.getRun(demo.baselineRunId),
    store.getRun(demo.currentRunId),
    store.getRunResults(demo.baselineRunId),
    store.getRunResults(demo.currentRunId),
  ]);
  if (!baselineRun || !currentRun) return null;

  const currentIds = new Set(currentResults.map((r) => r.testCaseId));
  const matchedCount = baselineResults.filter((r) => currentIds.has(r.testCaseId)).length;

  const newFalsePositiveCount = (() => {
    const baselineById = new Map(baselineResults.map((r) => [r.testCaseId, r]));
    let count = 0;
    for (const cur of currentResults) {
      const base = baselineById.get(cur.testCaseId);
      if (!base) continue;
      const wasOk = base.testCase.expectedAction === "ALLOW" && base.actualAction === "ALLOW";
      const nowFp = cur.testCase.expectedAction === "ALLOW" && cur.actualAction === "BLOCK";
      if (wasOk && nowFp) count++;
    }
    return count;
  })();

  const worstCategory = [...demo.categoryComparison].sort((a, b) => a.delta - b.delta)[0] ?? null;
  const topRegression = worstCategory
    ? {
        category: worstCategory.category,
        baseline: worstCategory.baseline,
        current: worstCategory.current,
        newBypasses: demo.newBypasses.filter((b) => b.attackCategory === worstCategory.category).length,
      }
    : null;

  const topBypass = pickTopBypass(demo);

  return {
    regressionId: demo.id,
    baselineLabel: demo.baselineLabel,
    currentLabel: demo.currentLabel,
    baselineTestCount: baselineRun.stats.totalTests,
    currentTestCount: currentRun.stats.totalTests,
    matchedCount,
    previousCoverage: demo.previousCoverage,
    currentCoverage: demo.currentCoverage,
    changePoints: demo.changePoints,
    newBypassCount: demo.newBypassCount,
    newFalsePositiveCount,
    topRegression,
    topBypassPrompt: topBypass?.prompt ?? null,
  };
}

export default async function LandingPage() {
  const [summary, demoData] = await Promise.all([buildDashboardSummary(), buildRegressionDemoData()]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border-soft px-6 py-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-accent" size={20} />
          <span className="text-sm font-semibold tracking-tight">SentinelLab</span>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-muted lg:flex">
          <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
          <Link href="/compare" className="hover:text-foreground">Compare</Link>
          <Link href="/attack-lab" className="hover:text-foreground">Attack Lab</Link>
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
              Continuous security validation for AI policies
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Test Your AI Security Before Attackers Do.</h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted">
              Continuously evaluate AI security policies against evolving attacks, policy changes, and false positives.
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-2">
              Every policy change becomes a security test: generate attacks, test legitimate usage, detect regressions, and block unsafe releases.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="#regression-demo" className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-black hover:bg-accent-strong">
                Run Regression Demo <ArrowRight size={14} />
              </Link>
              <Link
                href="/attack-lab"
                className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-5 py-2.5 text-sm font-semibold text-foreground hover:border-accent/40"
              >
                <Swords size={14} /> Explore Attack Lab
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-muted-2">The Regression Lifecycle</h2>
          <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-4">
            {LIFECYCLE_STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center gap-1">
                <div className="flex flex-col items-center gap-1.5 px-2 text-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <step.icon size={16} />
                  </div>
                  <span className="max-w-[6.5rem] text-[11px] font-medium leading-tight text-foreground">{step.label}</span>
                </div>
                {i < LIFECYCLE_STEPS.length - 1 && <ArrowRight size={14} className="hidden shrink-0 text-muted-2 sm:block" />}
              </div>
            ))}
          </div>
        </section>

        <section id="regression-demo" className="border-y border-border-soft bg-surface/30 px-6 py-16">
          <h2 className="mb-1 text-center text-xs font-semibold uppercase tracking-widest text-muted-2">Killer Feature</h2>
          <h3 className="mb-8 text-center text-2xl font-bold text-foreground">See a Real Security Regression, Live</h3>
          {demoData ? (
            <RunRegressionDemo data={demoData} />
          ) : (
            <p className="text-center text-sm text-muted">Run a security test from the Policies page to populate the regression demo.</p>
          )}
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
            <h2 className="mb-1 text-center text-xs font-semibold uppercase tracking-widest text-muted-2">Prototype Security Evaluation</h2>
            <p className="mb-8 text-center text-sm text-muted">Real numbers, computed live by the deterministic engine — not fabricated.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ScoreTile label="Security Coverage" value={`${summary.securityCoverage}%`} />
              <ScoreTile label="Attack Detection" value={`${summary.attackDetection.blocked}/${summary.attackDetection.total}`} />
              <ScoreTile label="False Positive Rate" value={`${summary.falsePositiveRate}%`} />
              <ScoreTile label="Critical Bypasses" value={String(summary.criticalBypasses)} accent="danger" />
            </div>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-2">
              <TriangleAlert size={12} /> This scorecard is a prototype evaluation metric and is not a formal security certification or guarantee.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="mb-3 text-lg font-semibold text-foreground">An independent research prototype</h2>
          <p className="text-sm leading-relaxed text-muted">
            SentinelLab is an independent AI security testing and policy regression prototype, inspired by publicly documented AI-security
            problems. It is not affiliated with or endorsed by any third-party AI security company, and it is not a production security
            solution — it is a demonstration of continuous validation methodology, from policy change to CI/CD gate.
          </p>
        </section>
      </main>

      <footer className="border-t border-border-soft px-6 py-6 text-center text-xs text-muted-2">
        SentinelLab — AI Security Regression Lab. Independent research prototype, not affiliated with any AI security vendor.
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
