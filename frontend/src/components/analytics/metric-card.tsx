import { Card, CardBody } from "@/components/ui/card";

export function MetricCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-black text-ink">{value}</p>
        {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
      </CardBody>
    </Card>
  );
}

