import { PublicShell } from "@/components/layout/product-shell";
import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";

export default async function LeaderboardPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = await params;
  return (
    <PublicShell>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <LeaderboardView roomCode={roomCode} />
      </main>
    </PublicShell>
  );
}
