import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { isDemoMode } from "@/lib/data/store";
import { llmStatus } from "@/lib/llm/provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const demoMode = isDemoMode();
  const { mode } = llmStatus();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar demoMode={demoMode} llmMode={mode} />
        <MobileNav />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
