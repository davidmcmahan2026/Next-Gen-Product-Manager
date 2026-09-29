import { PageShell } from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  UploadCloud,
  ListChecks,
  ClipboardList,
  Download,
  FileSpreadsheet,
  Sparkles,
  UserCheck,
  UserX,
  Cog,
  ShieldCheck,
  Upload as UploadIcon,
} from "lucide-react";
import { auditTrail, currentDataset, type AuditType, type PersonaId } from "@/lib/mockData";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/upload", label: "Upload", icon: UploadCloud },
  { to: "/review", label: "Review & Approve", icon: ListChecks },
  { to: "/audit", label: "Audit & Export", icon: ClipboardList },
];

const typeConfig: Record<AuditType, { icon: typeof Sparkles; color: string }> = {
  upload: { icon: UploadIcon, color: "text-muted-foreground" },
  recommendation: { icon: Sparkles, color: "text-[#2c6e8c]" },
  approval: { icon: UserCheck, color: "text-[#2c6e8c]" },
  rejection: { icon: UserX, color: "text-[#8a8378]" },
  execution: { icon: Cog, color: "text-[#b5502c]" },
  export: { icon: Download, color: "text-muted-foreground" },
  policy: { icon: ShieldCheck, color: "text-[#b5502c]" },
};

interface AuditExportPageProps {
  activePersona: PersonaId;
}

export default function AuditExportPage({ activePersona }: AuditExportPageProps) {
  return (
    <PageShell
      activePersona={activePersona}
      navItems={navItems}
      title="Audit & export"
      description="Every recommendation, approval, and gated execution is logged automatically — this trail is written by the Rules Engine and audit tool, not by Cleo."
    >
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Dataset</p>
            <p className="mt-1 text-sm font-semibold">{currentDataset.fileName}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Rows affected to date</p>
            <p className="mt-1 text-sm font-semibold">1,690 of {currentDataset.rowCount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Gated executions</p>
            <p className="mt-1 text-sm font-semibold">1 completed · 4 pending</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Audit trail</CardTitle>
            <CardDescription>Immutable, append-only log</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button size="sm" className="gap-1.5 bg-[#2c6e8c] hover:bg-[#25576f]">
              <Download className="h-3.5 w-3.5" />
              Export cleaned dataset
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[170px]">Timestamp</TableHead>
                <TableHead className="w-[130px]">Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditTrail.map((entry) => {
                const cfg = typeConfig[entry.type];
                const Icon = cfg.icon;
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {entry.timestamp}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1",
                          entry.actor === "Cleo" && "border-[#2c6e8c]/30 text-[#2c6e8c]"
                        )}
                      >
                        {entry.actor}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={cn("flex items-center gap-1.5 text-sm font-medium", cfg.color)}>
                        <Icon className="h-3.5 w-3.5" />
                        {entry.action}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{entry.detail}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
