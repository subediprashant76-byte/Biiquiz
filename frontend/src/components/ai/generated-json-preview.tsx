"use client";

import { useState } from "react";
import { Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

export function GeneratedJSONPreview({ value }: { value: unknown }) {
  const [open, setOpen] = useState(false);
  if (value === undefined || value === null) return null;
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-black text-ink">
            <Code2 size={18} className="text-brand-600" />
            Developer details
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen((current) => !current)}>
            {open ? "Hide raw JSON" : "View raw JSON"}
          </Button>
        </div>
        {open ? (
          <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-100">
            {JSON.stringify(value, null, 2)}
          </pre>
        ) : null}
      </CardBody>
    </Card>
  );
}
