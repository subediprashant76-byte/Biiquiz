import { WorkspaceShell } from "@/components/layout/product-shell";
import { AiGeneratorForm } from "@/components/ai/ai-generator-form";

export default async function AiGeneratePage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  return (
    <WorkspaceShell mode="host" title="AI Question Generator" subtitle="BYOK Gemini">
      <AiGeneratorForm quizId={quizId} />
    </WorkspaceShell>
  );
}
