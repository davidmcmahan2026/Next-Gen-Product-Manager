import { PageShell } from "@/components/PageShell";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldCheck,
  Lock,
  ScrollText,
  ClipboardList,
  Check,
  X,
  CircleCheck,
  CircleDashed,
} from "lucide-react";
import { gatedActionsQueue, auditTrail, workflowJobs, type PersonaId } from "@/lib/mockData";

const navItems = [
  { to: "/governance", label: "Governance Console", icon: ShieldCheck },
];

interface GovernanceConsolePageProps {
  activePersona: PersonaId;
}

const policyRegistry = [
  {
    rule: "state_code_normalization_v3",
    description: "Maps state name/abbreviation variants to USPS 2-letter codes.",
    scope: "Categorical fields",
    status: "active",
    lastReviewed: "2026-08-02",
  },
  {
    rule: "email_format_cleanup_v2",
    description: "Trims whitespace and lowercases email addresses after regex validation.",
    scope: "Contact fields",
    status: "active",
    lastReviewed: "2026-08-02",
  },
  {
    rule: "median_imputation_by_group",
    description: "Fills missing numeric values using the median within a categorical group.",
    scope: "Numeric fields",
    status: "active",
    lastReviewed: "2026-07-14",
  },
  {
    rule: "phone_e164_normalization",
    description: "Reformats phone numbers to E.164, assuming +1 where no country code is present.",
    scope: "Contact fields",
    status: "needs review",
    lastReviewed: "2026-06-29",
  },
  {
    rule: "cross_source_duplicate_heuristic",
    description: "Fuzzy-matches records across sources; never auto-merges, only flags for review.",
    scope: "Identity fields",
    status: "active",
    lastReviewed: "2026-08-20",
  },
];

export default function GovernanceConsolePage({ activePersona }: GovernanceConsolePageProps) {
  return (
    <PageShell
      activePersona={activePersona}
      navItems={navItems}
      title="Governance console"
      description="Org-wide visibility into every gated action Cleo has proposed, the rules that govern execution, and the audit trail behind them."
    >
      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending gated actions</p>
            <p className="mt-1 text-2xl font-semibold text-[#b5502c]">{gatedActionsQueue.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Active jobs</p>
            <p className="mt-1 text-2xl font-semibold">{workflowJobs.filter((j) => j.status !== "completed" && j.status !== "failed").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Policies active</p>
            <p className="mt-1 text-2xl font-semibold">{policyRegistry.filter((p) => p.status === "active").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Policies needing review</p>
            <p className="mt-1 text-2xl font-semibold text-[#b5502c]">
              {policyRegistry.filter((p) => p.status === "needs review").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue" className="gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Approval queue
          </TabsTrigger>
          <TabsTrigger value="policies" className="gap-1.5">
            <ScrollText className="h-3.5 w-3.5" /> Policy registry
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" /> Org audit trail
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Gated actions awaiting a decision</CardTitle>
              <CardDescription>
                These recommendations require human approval before the Rules Engine can execute them.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recommendation</TableHead>
                    <TableHead>Column</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Rows</TableHead>
                    <TableHead className="text-right">Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gatedActionsQueue.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="text-sm font-medium">{rec.action}</TableCell>
                      <TableCell className="font-mono text-xs">{rec.column}</TableCell>
                      <TableCell>
                        <ConfidenceBadge level={rec.confidence} score={rec.confidenceScore} />
                      </TableCell>
                      <TableCell className="text-sm">{rec.evidence.rows.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" className="gap-1">
                            <X className="h-3.5 w-3.5" /> Reject
                          </Button>
                          <Button size="sm" className="gap-1 bg-[#2c6e8c] hover:bg-[#25576f]">
                            <Check className="h-3.5 w-3.5" /> Approve
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Rules Engine policy registry</CardTitle>
              <CardDescription>
                The deterministic rules Cleo may recommend but never executes directly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Last reviewed</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policyRegistry.map((p) => (
                    <TableRow key={p.rule}>
                      <TableCell className="font-mono text-xs">{p.rule}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-sm">{p.description}</TableCell>
                      <TableCell className="text-sm">{p.scope}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.lastReviewed}</TableCell>
                      <TableCell className="text-right">
                        {p.status === "active" ? (
                          <Badge variant="outline" className="gap-1 border-[#2c6e8c]/30 text-[#2c6e8c]">
                            <CircleCheck className="h-3 w-3" /> Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 border-[#b5502c]/30 text-[#b5502c]">
                            <CircleDashed className="h-3 w-3" /> Needs review
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Org-wide audit trail</CardTitle>
              <CardDescription>Same immutable log surfaced to analysts, aggregated across all jobs.</CardDescription>
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
                  {auditTrail.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{entry.timestamp}</TableCell>
                      <TableCell className="text-sm">{entry.actor}</TableCell>
                      <TableCell className="text-sm font-medium">{entry.action}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entry.detail}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
