"use client";

import { useEffect, useState } from "react";
import { Download, Share2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

type Row = {
  rank: number;
  displayName: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  attemptedCount: number;
  accuracyPercent: number;
};

export function LeaderboardView({ roomCode }: { roomCode: string }) {
  const [rows, setRows] = useState<Row[]>([]);

  async function refresh() {
    const response = await fetch(`/api/leaderboard/${roomCode}`);
    const body = (await response.json()) as { ok: boolean; data?: Row[] };
    if (body.ok && body.data) setRows(body.data);
  }

  useEffect(() => {
    void refresh();
    const id = window.setInterval(refresh, 3000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <Card className="shadow-lifted">
      <CardBody>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-brand-600">Final standings</p>
            <h1 className="mt-1 text-3xl font-black text-ink">Leaderboard</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm"><Share2 size={15} />Share</Button>
            <a className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold shadow-sm" href={`/api/rooms/${roomCode}/results.csv`}>
              <Download size={15} />CSV
            </a>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {rows.slice(0, 3).map((row, index) => (
            <div key={row.rank} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
              <Trophy className={index === 0 ? "mx-auto text-warning-500" : "mx-auto text-slate-400"} />
              <p className="mt-2 text-sm font-black text-slate-500">#{row.rank}</p>
              <p className="mt-1 font-black text-ink">{row.displayName}</p>
              <p className="text-sm font-bold text-brand-600">{row.score} pts</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-2">
          {rows.map((row) => (
            <div key={row.rank} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-sm font-black text-brand-700">#{row.rank}</span>
              <div>
                <p className="font-black text-ink">{row.displayName}</p>
                <p className="text-xs font-semibold text-slate-500">{row.correctCount} correct · {row.accuracyPercent}% accuracy</p>
              </div>
              <p className="text-lg font-black text-ink">{row.score}</p>
            </div>
          ))}
        </div>
        {rows.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No scores yet.</p> : null}
      </CardBody>
    </Card>
  );
}
