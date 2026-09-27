import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { RESEARCH_TOPICS } from "@/lib/research";

function Section({ label, children, tone }: { label: string; children: React.ReactNode; tone?: "muted" | "accent" | "warning" | "success" }) {
  const toneClass = {
    muted: "text-muted",
    accent: "text-accent",
    warning: "text-warning",
    success: "text-success",
  }[tone ?? "muted"];
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-2">{label}</div>
      <p className={`mt-1 text-sm leading-relaxed ${toneClass}`}>{children}</p>
    </div>
  );
}

export default function AttackResearchPage() {
  return (
    <>
      <PageHeader
        title="Security Research"
        description="Documented AI-security threats, this platform's prototype detection approach, and how each is tested — with limitations stated plainly."
      />

      <div className="flex items-center gap-2 rounded-lg border border-border-soft bg-surface-2/40 px-4 py-2.5 text-xs text-muted">
        <span className="font-medium text-foreground">Reading order:</span>
        THREAT <ArrowRight size={12} /> DETECTION <ArrowRight size={12} /> TEST <ArrowRight size={12} /> MITIGATION <ArrowRight size={12} /> LIMITATIONS
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {RESEARCH_TOPICS.map((topic) => (
          <Card key={topic.id}>
            <CardContent className="flex flex-col gap-4">
              <h2 className="text-base font-semibold text-foreground">{topic.title}</h2>
              <Section label="Threat">{topic.threat}</Section>
              <Section label="Threat Model">{topic.threatModel}</Section>
              <Section label="Example" tone="warning">
                {topic.example}
              </Section>
              <Section label="Detection Approach (prototype)" tone="accent">
                {topic.detectionApproach}
              </Section>
              <Section label="Test Strategy">{topic.testStrategy}</Section>
              <Section label="Recommended Mitigation" tone="success">
                {topic.mitigation}
              </Section>
              <Section label="Known Limitations">{topic.limitations}</Section>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
