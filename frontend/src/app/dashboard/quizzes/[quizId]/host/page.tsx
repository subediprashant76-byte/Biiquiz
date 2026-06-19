import { WorkspaceShell } from "@/components/layout/product-shell";
import { CreateRoomForm } from "@/components/room/create-room-form";

export default async function CreateLiveRoomPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  return (
    <WorkspaceShell mode="host" title="Create Live Room" subtitle="Room setup">
      <CreateRoomForm quizId={quizId} />
    </WorkspaceShell>
  );
}
