import { WorkspaceShell } from "@/components/layout/product-shell";
import { CreateQuizForm } from "@/components/quiz/create-quiz-form";

export default function CreateQuizPage() {
  return (
    <WorkspaceShell mode="host" title="Create Quiz" subtitle="Quiz setup">
      <CreateQuizForm />
    </WorkspaceShell>
  );
}
