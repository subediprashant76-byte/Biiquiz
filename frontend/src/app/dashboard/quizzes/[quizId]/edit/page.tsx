import { Bot, RadioTower } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/product-shell";
import { LinkButton } from "@/components/ui/button";
import { QuestionEditor } from "@/components/quiz/question-editor";

export default async function QuizEditorPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  return (
    <WorkspaceShell
      mode="host"
        title="Quiz Editor"
      subtitle="Question builder"
        action={
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`/dashboard/quizzes/${quizId}/ai-generate`} variant="secondary"><Bot size={16} />AI generator</LinkButton>
            <LinkButton href={`/dashboard/quizzes/${quizId}/host`}><RadioTower size={16} />Create room</LinkButton>
          </div>
        }
    >
      <QuestionEditor quizId={quizId} />
    </WorkspaceShell>
  );
}
