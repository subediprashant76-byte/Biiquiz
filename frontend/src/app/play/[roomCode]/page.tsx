import { PublicShell } from "@/components/layout/product-shell";
import { PlayRoom } from "@/components/participant/play-room";

export default async function PlayPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = await params;
  return (
    <PublicShell>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <PlayRoom roomCode={roomCode} />
      </main>
    </PublicShell>
  );
}
