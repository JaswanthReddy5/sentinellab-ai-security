import { isDemoMode } from "@/lib/data/store";
import { llmStatus } from "@/lib/llm/provider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CodeBlock } from "@/components/ui/CodeBlock";

export default function SettingsPage() {
  const demoMode = isDemoMode();
  const llm = llmStatus();

  return (
    <>
      <PageHeader title="Settings" description="Environment status, thresholds, and configuration for this SentinelLab instance." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Data Store</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Mode</span>
              <Badge tone={demoMode ? "accent" : "success"}>{demoMode ? "In-memory demo store" : "Postgres (Prisma)"}</Badge>
            </div>
            <p className="text-xs text-muted">
              {demoMode
                ? "No DATABASE_URL is configured, so SentinelLab is running on a deterministic in-memory dataset. All features work fully — data resets when the server restarts."
                : "Connected to a Postgres database via Prisma. Data persists across restarts."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>LLM Provider</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Mode</span>
              <Badge tone={llm.configured ? "accent" : "neutral"}>{llm.provider}</Badge>
            </div>
            <p className="text-xs text-muted">
              {llm.configured
                ? `Using ${llm.provider} to assist with natural-language variety in generated content.`
                : "No OPENAI_API_KEY or ANTHROPIC_API_KEY configured — using the deterministic local attack-generation and policy-evaluation engine. This is the default and fully-supported mode."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CI Threshold Defaults</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted">
            <p className="mb-2">Default minimum security coverage used by the CI example workflow:</p>
            <CodeBlock code={`minimum_security_coverage: 95`} language="yaml" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted">
            <p className="mb-2">See <span className="mono">.env.example</span> in the repository. None are required to run the demo.</p>
            <CodeBlock
              code={`DATABASE_URL=""\nOPENAI_API_KEY=""\nANTHROPIC_API_KEY=""`}
              language="bash"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Disclaimer</CardTitle>
        </CardHeader>
        <CardContent className="text-xs leading-relaxed text-muted">
          SentinelLab is an independent AI security testing and policy regression prototype. It is not affiliated with or endorsed by any
          third-party AI security company. Its detection engine is rule-based and heuristic — it is a demonstration of the regression-testing
          methodology, not a certified or production-grade security control.
        </CardContent>
      </Card>
    </>
  );
}
