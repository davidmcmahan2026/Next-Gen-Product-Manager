import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  UploadCloud,
  FileCheck2,
  ListChecks,
  ClipboardList,
  Sparkles,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";
import { currentDataset, columnProfiles, type PersonaId } from "@/lib/mockData";
import { parseSpreadsheet, type ParsedDataset } from "@/lib/parseFile";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/upload", label: "Upload", icon: UploadCloud },
  { to: "/review", label: "Review & Approve", icon: ListChecks },
  { to: "/audit", label: "Audit & Export", icon: ClipboardList },
];

interface UploadPageProps {
  activePersona: PersonaId;
}

// Accepted formats for this prototype: CSV and both Excel flavors.
const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];
const ACCEPTED_MIME_TYPES = [
  "text/csv",
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
];
const ACCEPT_ATTR = [...ACCEPTED_EXTENSIONS, ...ACCEPTED_MIME_TYPES].join(",");

type FileKind = "csv" | "excel";

function detectFileKind(file: File): FileKind | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || file.type === "text/csv") return "csv";
  if (name.endsWith(".xlsx") || name.endsWith(".xls") || ACCEPTED_MIME_TYPES.slice(1).includes(file.type)) {
    return "excel";
  }
  return null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPage({ activePersona }: UploadPageProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileKind, setFileKind] = useState<FileKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedDataset | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const acceptFile = async (file: File) => {
    const kind = detectFileKind(file);
    if (!kind) {
      setError(`"${file.name}" isn't a CSV or Excel file. Accepted formats: .csv, .xlsx, .xls.`);
      setSelectedFile(null);
      setFileKind(null);
      setParsed(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
    setFileKind(kind);
    setParsed(null);
    setParsing(true);

    try {
      const result = await parseSpreadsheet(file);
      setParsed(result);
    } catch (err) {
      setError(
        `Couldn't read "${file.name}": ${err instanceof Error ? err.message : "unknown error"}. ` +
          "Check that it has a header row and at least one row of data."
      );
      setSelectedFile(null);
      setFileKind(null);
    } finally {
      setParsing(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void acceptFile(file);
    e.target.value = ""; // allow re-selecting the same file
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void acceptFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFileKind(null);
    setError(null);
    setParsed(null);
  };

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => navigate("/review"), 1400);
  };

  // Once a real file is parsed, its rows/columns replace the sample data.
  // Until then (or if parsing failed), the screen shows the pre-loaded demo
  // dataset from mockData.ts so the page isn't empty.
  const displayName = selectedFile?.name ?? currentDataset.fileName;
  const displayUploadedBy = currentDataset.uploadedBy;
  const displayUploadedAt = selectedFile ? "just now" : currentDataset.uploadedAt;
  const displayRowCount = parsed?.rowCount ?? currentDataset.rowCount;
  const displayColumnCount = parsed?.columnCount ?? currentDataset.columnCount;
  const displayColumns = parsed?.columns ?? columnProfiles;
  const isRealData = Boolean(parsed);

  return (
    <PageShell
      activePersona={activePersona}
      navItems={navItems}
      title="Upload dataset"
      description="Bring in a file for Cleo to profile. Cleo only recommends changes — nothing is written until you approve it."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3">
          <Card
            className={cn(
              "border-dashed transition-colors",
              dragActive && "border-[#2c6e8c] bg-[#2c6e8c]/5"
            )}
          >
            <CardContent
              className="flex flex-col items-center justify-center gap-3 py-14 text-center"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2c6e8c]/10">
                <UploadCloud className="h-6 w-6 text-[#2c6e8c]" />
              </div>
              <div>
                <p className="text-sm font-medium">Drag and drop a CSV or Excel file</p>
                <p className="text-xs text-muted-foreground">
                  .csv, .xlsx, or .xls · parsed right here in the browser
                </p>
              </div>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => inputRef.current?.click()}>
                Choose file
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT_ATTR}
                className="hidden"
                onChange={handleInputChange}
              />
            </CardContent>
          </Card>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {selectedFile && !error && (
            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-xs">
              <span className="flex items-center gap-2 text-muted-foreground">
                {parsing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2c6e8c]" />
                ) : fileKind === "csv" ? (
                  <FileText className="h-3.5 w-3.5 text-[#2c6e8c]" />
                ) : (
                  <FileSpreadsheet className="h-3.5 w-3.5 text-[#2c6e8c]" />
                )}
                <span className="font-medium text-foreground">{selectedFile.name}</span>
                <span>· {formatBytes(selectedFile.size)}</span>
                <Badge variant="outline" className="border-[#2c6e8c]/30 text-[#2c6e8c]">
                  {fileKind === "csv" ? "CSV" : "Excel"}
                </Badge>
                {parsing && <span>parsing…</span>}
                {!parsing && parsed && <span>{parsed.rowCount.toLocaleString()} rows read</span>}
              </span>
              <button
                onClick={clearFile}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Remove selected file"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {fileKind === "excel" ? (
                  <FileSpreadsheet className="h-4 w-4 text-[#2c6e8c]" />
                ) : (
                  <FileCheck2 className="h-4 w-4 text-[#2c6e8c]" />
                )}
                {displayName}
              </CardTitle>
              <CardDescription>
                Uploaded by {displayUploadedBy} · {displayUploadedAt}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Rows</p>
                <p className="font-semibold">{displayRowCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Columns</p>
                <p className="font-semibold">{displayColumnCount}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {isRealData
                ? "Row/column counts and the profile below were computed from the file you uploaded, parsed in the browser."
                : "Showing the pre-loaded sample dataset — upload a CSV or Excel file to profile your own data."}
            </p>

            {analyzing ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-[#2c6e8c]">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  Cleo is profiling the dataset…
                </div>
                <Progress value={66} className="h-1.5" />
              </div>
            ) : (
              <Button
                onClick={handleAnalyze}
                disabled={parsing}
                className="w-full bg-[#2c6e8c] hover:bg-[#25576f]"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Send to Cleo for analysis
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Column profile</CardTitle>
          <CardDescription>
            {isRealData
              ? "Computed client-side from your file — type inferred, nulls and duplicate-format issues detected."
              : "Deterministic scan — no LLM involved in this step."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Column</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Null %</TableHead>
                <TableHead>Unique %</TableHead>
                <TableHead className="text-right">Issues flagged</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayColumns.map((c) => (
                <TableRow key={c.name}>
                  <TableCell className="font-mono text-[13px]">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.type}</TableCell>
                  <TableCell>{c.nullPercent}%</TableCell>
                  <TableCell>{c.uniquePercent}%</TableCell>
                  <TableCell className="text-right">
                    {c.issues > 0 ? (
                      <span className="font-medium text-[#b5502c]">{c.issues}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
