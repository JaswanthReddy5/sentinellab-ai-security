import { readFileSync } from "node:fs";
import path from "node:path";
import { Download, GitCommit, ShieldAlert, FlaskConical, GitPullRequestArrow, CircleCheck } from "lucide-react";
import { getStore } from "@/lib/data/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { ThresholdChecker } from "@/components/ci/ThresholdChecker";

export const dynamic = "force-dynamic";

const PIPELINE_STEPS = [
  { icon: GitCommit, label: "Git Commit", description: "A policy file changes in a pull request." },
  { icon: ShieldAlert, label: "Policy Changed", description: "SentinelLab detects the changed policy path." },
  { icon: FlaskConical, label: "Security Tests Run", description: "The full attack + benign suite runs automatically." },
  { icon: GitPullRequestArrow, label: "Regression Detected?", description: "Coverage and bypasses are compared to baseline." },
  { icon: CircleCheck, label: "PASS / FAIL", description: "The CI check passes or fails the pull request." },
];

export default async function CIPage() {
  const store = getStore();
  const runs = await store.listRuns();

  let workflowYaml = "";
  try {
    // Read from /public (guaranteed to be included in the deployment bundle)
    // rather than .github/workflows, which is not traced by the Next.js
    // serverless build.
    workflowYaml = readFileSync(path.join(process.cwd(), "public", "ai-security-regression.yml"), "utf-8");
  } catch {
    workflowYaml = "# workflow file not found";
  }

  return (
    <>
      <PageHeader
        title="CI/CD Integration"
        description="SentinelLab is designed to run as a security gate in your pull request pipeline — like GitHub Actions, but for AI security policies."
      />

      <Card>
        <CardHeader>
          <CardTitle>Pipeline Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.label} className="flex flex-col items-center gap-2 rounded-lg border border-border-soft bg-surface-2/40 p-3 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <step.icon size={16} />
                </div>
                <span className="text-xs font-semibold text-foreground">
                  {i + 1}. {step.label}
                </span>
                <span className="text-[11px] text-muted">{step.description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Simulate a CI Threshold Check</CardTitle>
            <CardDescription>Pick a test run and a minimum coverage threshold to see whether the CI check would pass or fail.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ThresholdChecker runs={runs} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Example GitHub Actions Workflow</CardTitle>
            <CardDescription>Drop this into your repo&apos;s .github/workflows/ directory alongside a policies/ folder.</CardDescription>
          </div>
          <a
            href="/ai-security-regression.yml"
            download="ai-security-regression.yml"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent/40 hover:text-accent"
          >
            <Download size={13} /> Download
          </a>
        </CardHeader>
        <CardContent>
          <CodeBlock code={workflowYaml} language="yaml" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Real CLI check (used by the workflow above)</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`npx tsx scripts/ci-security-check.ts \\
  --policy policies/prevent_customer_data_leak.v2.yaml \\
  --baseline policies/prevent_customer_data_leak.v1.yaml \\
  --threshold 95`}
            language="bash"
          />
          <p className="mt-3 text-xs text-muted">
            This is a real, working script in this repository (<span className="mono">scripts/ci-security-check.ts</span>) — it uses the same
            deterministic engine that powers the rest of SentinelLab, so what you see in the dashboard is exactly what runs in CI.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
