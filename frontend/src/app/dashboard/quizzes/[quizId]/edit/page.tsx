import { Bot, RadioTower } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/product-shell";
import { Button, LinkButton } from "@/components/ui/button";
import { QuestionEditor } from "@/components/quiz/question-editor";
import { requireHost } from "@/lib/auth";
import { getQuizForHost } from "@/services/quiz.service";

export default async function QuizEditorPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  const quiz = await getQuizForHost(await requireHost(), quizId);
  const questionCount = quiz.questions.length;
  return (
    <WorkspaceShell
      mode="host"
        title="Quiz Editor"
      subtitle="Question builder"
        action={
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`/dashboard/quizzes/${quizId}/ai-generate`} variant="secondary"><Bot size={16} />AI generator</LinkButton>
            {questionCount > 0 ? (
              <LinkButton href={`/dashboard/quizzes/${quizId}/host`}><RadioTower size={16} />Go live</LinkButton>
            ) : (
              <Button disabled><RadioTower size={16} />Add questions first</Button>
            )}
          </div>
        }
    >
      <QuestionEditor quizId={quizId} />
    </WorkspaceShell>
  );
}
