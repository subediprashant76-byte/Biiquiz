import { WorkspaceShell } from "@/components/layout/product-shell";
import { AiPreview } from "@/components/ai/ai-preview";

export default async function AiPreviewPage({ params }: { params: Promise<{ generationId: string }> }) {
  const { generationId } = await params;
  return (
    <WorkspaceShell mode="host" title="AI Preview" subtitle="Review and publish">
      <AiPreview generationId={generationId} />
    </WorkspaceShell>
  );
}
