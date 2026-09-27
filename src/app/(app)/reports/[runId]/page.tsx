import { notFound } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { categoryBreakdown } from "@/lib/engine/runner";
import { categoryLabel } from "@/lib/categories";
import { PrintButton } from "@/components/reports/PrintButton";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const store = getStore();
  const run = await store.getRun(runId);
  if (!run) notFound();

  const [results, recommendations, allRuns] = await Promise.all([
    store.getRunResults(runId),
    store.listRecommendations(runId),
    store.listRuns(),
  ]);

  const priorRun = allRuns
    .filter((r) => r.policyId === run.policyId && r.createdAt < run.createdAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  const categories = categoryBreakdown(results);
  const criticalBypasses = results.filter((r) => r.verdict === "CRITICAL_BYPASS");
  const falsePositives = results.filter((r) => r.verdict === "FALSE_POSITIVE");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 rounded-xl border border-border bg-white p-8 text-black print:border-0 print:p-0 print:shadow-none">
      <div className="flex items-center justify-between border-b border-black/10 pb-4 print:hidden">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">SentinelLab — Security Regression Report</span>
        <PrintButton />
      </div>

      <header>
        <h1 className="text-2xl font-bold">Security Regression Report</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {run.policyName} — {run.policyVersionLabel} · Generated {formatDateTime(new Date().toISOString())}
        </p>
      </header>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-700">Executive Summary</h2>
        <p className="text-sm leading-relaxed text-neutral-800">
          Policy <strong>{run.policyName}</strong> (version <strong>{run.policyVersionLabel}</strong>) was evaluated against{" "}
          <strong>{run.stats.totalTests.toLocaleString()}</strong> deterministic test cases spanning positive, negative, boundary, adversarial-mutation,
          and benign requests. The policy achieved <strong>{run.stats.securityCoverage}%</strong> security coverage (
          {run.stats.attacksBlocked} of {run.stats.attacksTotal} known attacks blocked) with a{" "}
          <strong>{run.stats.falsePositiveRate}%</strong> false-positive rate.{" "}
          {criticalBypasses.length > 0
            ? `${criticalBypasses.length} critical bypass(es) were identified and require remediation before this policy version is promoted.`
            : "No critical bypasses were identified in this run."}
        </p>
      </section>

      <section className="grid grid-cols-4 gap-3">
        {[
          ["Security Coverage", `${run.stats.securityCoverage}%`],
          ["Attack Detection", `${run.stats.attacksBlocked}/${run.stats.attacksTotal}`],
          ["False Positive Rate", `${run.stats.falsePositiveRate}%`],
          ["Critical Bypasses", String(criticalBypasses.length)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-black/10 p-3 text-center">
            <div className="text-lg font-bold">{value}</div>
            <div className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-700">Test Statistics</h2>
        <table className="w-full border-collapse text-sm">
          <tbody>
            {[
              ["Total test cases", run.stats.totalTests],
              ["Passed", run.stats.passed],
              ["Failed", run.stats.failed],
              ["Critical bypasses", run.stats.criticalBypasses],
              ["False positives", run.stats.falsePositives],
              ["Review mismatches", run.stats.reviewMismatches],
              ["Average model confidence", `${(run.stats.confidence * 100).toFixed(0)}%`],
            ].map(([label, value]) => (
              <tr key={label as string} className="border-b border-black/5">
                <td className="py-1.5 text-neutral-600">{label}</td>
                <td className="py-1.5 text-right font-medium">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-700">Attack Category Coverage</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs uppercase text-neutral-500">
              <th className="py-1.5">Category</th>
              <th className="py-1.5 text-right">Tested</th>
              <th className="py-1.5 text-right">Blocked</th>
              <th className="py-1.5 text-right">Coverage</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.category} className="border-b border-black/5">
                <td className="py-1.5">{categoryLabel(c.category)}</td>
                <td className="py-1.5 text-right">{c.total}</td>
                <td className="py-1.5 text-right">{c.blocked}</td>
                <td className="py-1.5 text-right font-medium">{c.coverage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {priorRun && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-700">Regression vs. Previous Version</h2>
          <p className="text-sm text-neutral-800">
            Previous version <strong>{priorRun.policyVersionLabel}</strong> achieved <strong>{priorRun.stats.securityCoverage}%</strong> coverage.
            Current version <strong>{run.policyVersionLabel}</strong> achieved <strong>{run.stats.securityCoverage}%</strong> (
            {(run.stats.securityCoverage - priorRun.stats.securityCoverage).toFixed(1)} point change).
          </p>
        </section>
      )}

      {criticalBypasses.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-red-700">Critical Bypasses ({criticalBypasses.length})</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-xs uppercase text-neutral-500">
                <th className="py-1.5">Category</th>
                <th className="py-1.5">Severity</th>
                <th className="py-1.5">Prompt</th>
              </tr>
            </thead>
            <tbody>
              {criticalBypasses.slice(0, 25).map((r) => (
                <tr key={r.id} className="border-b border-black/5 align-top">
                  <td className="py-1.5">{categoryLabel(r.testCase.attackCategory)}</td>
                  <td className="py-1.5 capitalize">{r.testCase.severity}</td>
                  <td className="py-1.5 text-neutral-700">{r.testCase.prompt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {falsePositives.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-amber-700">False Positives ({falsePositives.length})</h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {falsePositives.slice(0, 15).map((r) => (
                <tr key={r.id} className="border-b border-black/5 align-top">
                  <td className="py-1.5 text-neutral-700">{r.testCase.prompt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {recommendations.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-700">Recommendations</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-neutral-800">
            {recommendations.map((rec) => (
              <li key={rec.id}>
                <strong>{rec.problem}</strong> — {rec.recommendation}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="border-t border-black/10 pt-3 text-[11px] text-neutral-500">
        Generated by SentinelLab — an independent AI security testing and policy regression prototype. This report reflects a deterministic,
        rule-based evaluation and is not a certified or comprehensive security audit.
      </footer>
    </div>
  );
}
