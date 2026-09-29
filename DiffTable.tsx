import { ArrowRight } from "lucide-react";

interface DiffTableProps {
  before: string[];
  after: string[];
}

export function DiffTable({ before, after }: DiffTableProps) {
  const rows = Math.max(before.length, after.length);

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_1fr] bg-muted/50 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <div className="px-3 py-2">Before</div>
        <div className="px-2 py-2" />
        <div className="px-3 py-2">After</div>
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center text-sm">
            <div className="px-3 py-2 font-mono text-[13px] text-[#b5502c] bg-[#b5502c]/5">
              {before[i] ?? "—"}
            </div>
            <div className="px-2 py-2 text-muted-foreground">
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
            <div className="px-3 py-2 font-mono text-[13px] text-[#2c6e8c] bg-[#2c6e8c]/5">
              {after[i] ?? "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
