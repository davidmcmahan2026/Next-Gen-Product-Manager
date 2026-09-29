import { PageShell } from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  LayoutDashboard,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Timer,
  Loader2,
  XCircle,
  ListTodo,
} from "lucide-react";
import { workflowJobs, teamStats, confidenceDistribution, type JobStatus, type PersonaId } from "@/lib/mockData";
import { cn } from "@/lib/utils";

const navItems = [{ to: "/dashboard", label: "Manager Dashboard", icon: LayoutDashboard }];

interface ManagerDashboardPageProps {
  activePersona: PersonaId;
}

const statusConfig: Record<JobStatus, { label: string; icon: typeof Loader2; color: string }> = {
  queued: { label: "Queued", icon: ListTodo, color: "text-muted-foreground" },
  running: { label: "Running", icon: Loader2, color: "text-[#2c6e8c]" },
  awaiting_approval: { label: "Awaiting approval", icon: AlertTriangle, color: "text-[#b5502c]" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-[#2c6e8c]" },
  failed: { label: "Failed", icon: XCircle, color: "text-destructive" },
};

export default function ManagerDashboardPage({ activePersona }: ManagerDashboardPageProps) {
  const maxConfidence = Math.max(...confidenceDistribution.map((c) => c.value));

  return (
    <PageShell
      activePersona={activePersona}
      navItems={navItems}
      title="Manager dashboard"
      description="Team-wide throughput and confidence trends across every DataClean Studio job."
    >
      <div className="grid gap-4 sm:grid-cols-5 mb-6">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Active jobs</p>
            <p className="mt-1 text-2xl font-semibold">{teamStats.activeJobs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Awaiting approval</p>
            <p className="mt-1 text-2xl font-semibold text-[#b5502c]">{teamStats.awaitingApproval}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Completed this week</p>
            <p className="mt-1 text-2xl font-semibold text-[#2c6e8c]">{teamStats.completedThisWeek}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg time to approval</p>
            <p className="mt-1 text-2xl font-semibold">{teamStats.avgTimeToApprovalHours}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Low-confidence flags</p>
            <p className="mt-1 text-2xl font-semibold text-[#8a8378]">{teamStats.autoFlaggedLowConfidence}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Jobs across the team</CardTitle>
            <CardDescription>Every dataset currently in the Cleo pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflowJobs.map((job) => {
                  const cfg = statusConfig[job.status];
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={job.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{job.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{job.dataset}</p>
                      </TableCell>
                      <TableCell className="text-sm">{job.submittedBy}</TableCell>
                      <TableCell>
                        <span className={cn("flex items-center gap-1.5 text-xs font-medium", cfg.color)}>
                          <Icon className={cn("h-3.5 w-3.5", job.status === "running" && "animate-spin")} />
                          {cfg.label}
                          {job.pendingApprovals > 0 && (
                            <Badge variant="outline" className="ml-1 border-[#b5502c]/30 text-[#b5502c]">
                              {job.pendingApprovals}
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="w-40">
                        <div className="flex items-center gap-2">
                          <Progress value={job.progress} className="h-1.5" />
                          <span className="text-xs text-muted-foreground w-8">{job.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{job.updatedAt}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Timer className="h-4 w-4 text-[#2c6e8c]" />
                Confidence distribution
              </CardTitle>
              <CardDescription>Across all pending recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {confidenceDistribution.map((c) => (
                <div key={c.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{c.label}</span>
                    <span className="font-medium">{c.value}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${(c.value / maxConfidence) * 100}%`,
                        backgroundColor: c.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#2c6e8c]" />
                Note on this view
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground leading-relaxed">
              This dashboard reads from the same audit log and job registry the analysts and governance
              lead use — no separate data pipeline. In production this would poll the Bolt backend's
              job-status endpoint, backed by the same Postgres tables as the Rules Engine.
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
