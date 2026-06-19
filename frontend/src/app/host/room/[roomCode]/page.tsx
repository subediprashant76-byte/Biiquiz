import { WorkspaceShell } from "@/components/layout/product-shell";
import { HostRoomControl } from "@/components/room/host-room-control";

export default async function HostRoomPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = await params;
  return (
    <WorkspaceShell mode="host" title="Live Room Control" subtitle={`Room ${roomCode}`}>
      <HostRoomControl roomCode={roomCode} />
    </WorkspaceShell>
  );
}
