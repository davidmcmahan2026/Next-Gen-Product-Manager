import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { DiffTable } from "@/components/DiffTable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Check, X, Lock, Unlock, ShieldCheck, UploadCloud, ListChecks, ClipboardList } from "lucide-react";
import { recommendations as initialRecs, type Recommendation, type PersonaId } from "@/lib/mockData";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/upload", label: "Upload", icon: UploadCloud },
  { to: "/review", label: "Review & Approve", icon: ListChecks },
  { to: "/audit", label: "Audit & Export", icon: ClipboardList },
];

interface ReviewApprovePageProps {
  activePersona: PersonaId;
}

export default function ReviewApprovePage({ activePersona }: ReviewApprovePageProps) {
  const [recs, setRecs] = useState<Recommendation[]>(initialRecs);

  const setStatus = (id: string, status: Recommendation["status"]) => {
    setRecs((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const pendingCount = recs.filter((r) => r.status === "pending").length;

  return (
    <PageShell
      activePersona={activePersona}
      navItems={navItems}
      title="Review & approve"
      description="Cleo proposes, cites its evidence, and scores its confidence. Nothing below is applied until you approve it — approved actions route through the Rules Engine gate."
    >
      <div className="mb-4 flex items-center gap-3">
        <Badge variant="secondary" className="gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          {pendingCount} awaiting your decision
        </Badge>
        <span className="text-xs text-muted-foreground">
          Recommendations are read-only for Cleo — approval and execution happen outside the model.
        </span>
      </div>

      <Accordion type="single" collapsible className="space-y-3">
        {recs.map((rec) => (
          <AccordionItem
            key={rec.id}
            value={rec.id}
            className={cn(
              "rounded-lg border bg-background px-1",
              rec.status === "approved" && "border-[#2c6e8c]/40",
              rec.status === "rejected" && "border-muted opacity-60"
            )}
          >
            <div className="flex items-center gap-3 px-3 py-1">
              <AccordionTrigger className="flex-1 py-3 hover:no-underline">
                <div className="flex flex-1 items-center justify-between pr-4">
                  <div className="text-left">
                    <p className="text-sm font-medium">{rec.action}</p>
                    <p className="text-xs text-muted-foreground">
                      Column <span className="font-mono">{rec.column}</span> · {rec.evidence.rows.toLocaleString()} rows affected
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {rec.gated ? (
                      <Badge variant="outline" className="gap-1 border-[#b5502c]/30 text-[#b5502c]">
                        <Lock className="h-3 w-3" /> Gated
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <Unlock className="h-3 w-3" /> Advisory only
                      </Badge>
                    )}
                    <ConfidenceBadge level={rec.confidence} score={rec.confidenceScore} />
                  </div>
                </div>
              </AccordionTrigger>
            </div>

            <AccordionContent className="px-4 pb-4">
              <div className="space-y-4 border-t pt-4">
                <p className="text-sm text-muted-foreground">{rec.explanation}</p>

                <div className="rounded-md bg-muted/40 p-3 text-xs">
                  <p className="mb-1 font-medium text-foreground">Evidence cited by Cleo</p>
                  <p className="text-muted-foreground">
                    Rule <span className="font-mono">{rec.evidence.rule}</span> · sample values:{" "}
                    {rec.evidence.sample.map((s, i) => (
                      <span key={i} className="font-mono">
                        {s}
                        {i < rec.evidence.sample.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </p>
                </div>

                <DiffTable before={rec.before} after={rec.after} />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    Status: <span className="font-medium capitalize">{rec.status}</span>
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => setStatus(rec.id, "rejected")}
                      disabled={rec.status === "rejected"}
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-[#2c6e8c] hover:bg-[#25576f]"
                      onClick={() => setStatus(rec.id, "approved")}
                      disabled={rec.status === "approved"}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {rec.gated ? "Approve & send to Rules Engine" : "Acknowledge"}
                    </Button>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <Card className="mt-6 border-dashed">
        <CardContent className="flex items-center gap-3 py-4 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          Every approval and execution below is written to the audit log automatically — see Audit &amp; Export.
        </CardContent>
      </Card>
    </PageShell>
  );
}
