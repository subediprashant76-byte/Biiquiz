"use client";

import { useEffect, useMemo, useState } from "react";

export function TimerRing({ endsAt, startedAt }: { endsAt: string | Date; startedAt: string | Date }) {
  const startMs = useMemo(() => new Date(startedAt).getTime(), [startedAt]);
  const endMs = useMemo(() => new Date(endsAt).getTime(), [endsAt]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  const total = Math.max(1, endMs - startMs);
  const remaining = Math.max(0, endMs - now);
  const percent = Math.max(0, Math.min(100, (remaining / total) * 100));
  const seconds = Math.ceil(remaining / 1000);

  return (
    <div className="grid place-items-center">
      <div
        className="grid size-28 place-items-center rounded-full"
        style={{ background: `conic-gradient(#2563eb ${percent}%, #e2e8f0 0)` }}
      >
        <div className="grid size-20 place-items-center rounded-full bg-white">
          <span className="text-2xl font-black text-ink">{seconds}</span>
        </div>
      </div>
    </div>
  );
}

