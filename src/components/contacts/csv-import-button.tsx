"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CONTACT_CSV_COLUMNS,
  chunkArray,
  parseContactsCsv,
  parseContactsMatrix,
  sheetHasContactHeaders,
  type ContactImportRow,
} from "@/lib/csv/parse-contacts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TEMPLATE_URL = "/templates/contacts-template.csv";
const CHUNK_SIZE = 500;
const MAX_FILE_BYTES = 50 * 1024 * 1024;

type SheetSelection = {
  name: string;
  rows: ContactImportRow[];
  selected: boolean;
};

type PreparedFile = {
  id: string;
  file: File;
  sheets: SheetSelection[];
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isSpreadsheet(file: File) {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".csv") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    file.type === "text/csv" ||
    file.type === "application/vnd.ms-excel" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

function sanitizeContacts(rows: ContactImportRow[]): ContactImportRow[] {
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return rows.map((row) => ({
    ...row,
    email: row.email && emailOk.test(row.email) ? row.email : undefined,
  }));
}

async function prepareFile(file: File): Promise<PreparedFile> {
  const id = `${file.name}-${file.size}-${file.lastModified}`;
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv")) {
    const text = await file.text();
    const rows = sanitizeContacts(parseContactsCsv(text));
    return {
      id,
      file,
      sheets: [{ name: "Sheet1", rows, selected: rows.length > 0 }],
    };
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheets: SheetSelection[] = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
    }) as unknown[][];
    const headers = (matrix[0] ?? []).map((cell) => String(cell ?? ""));
    const rows = sheetHasContactHeaders(headers)
      ? sanitizeContacts(parseContactsMatrix(matrix))
      : [];
    return {
      name: sheetName,
      rows,
      selected: rows.length > 0,
    };
  });

  return { id, file, sheets };
}

export function CsvImportButton({
  variant = "default",
  size = "default",
  label = "Import CSV",
  onImported,
}: {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  label?: string;
  onImported?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const queryClient = useQueryClient();

  const resetSelection = () => {
    setPrepared([]);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      resetSelection();
      setIsDragging(false);
      setParsing(false);
    }
  };

  const addFiles = async (fileList: FileList | File[] | null | undefined) => {
    if (!fileList) return;
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setParsing(true);
    try {
      const next: PreparedFile[] = [];
      for (const file of files) {
        if (!isSpreadsheet(file)) {
          toast.error(`${file.name}: use .csv, .xlsx, or .xls`);
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          toast.error(`${file.name}: max size is 50 MB`);
          continue;
        }
        const preparedFile = await prepareFile(file);
        const totalRows = preparedFile.sheets.reduce((sum, s) => sum + s.rows.length, 0);
        if (totalRows === 0) {
          toast.error(
            `${file.name}: no contacts found. Use columns: name, email, title, company`,
          );
          continue;
        }
        next.push(preparedFile);
      }

      if (next.length === 0) return;

      setPrepared((prev) => {
        const byId = new Map(prev.map((p) => [p.id, p]));
        for (const item of next) byId.set(item.id, item);
        return Array.from(byId.values());
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to read file");
    } finally {
      setParsing(false);
    }
  };

  const selectedContactCount = prepared.reduce(
    (sum, file) =>
      sum +
      file.sheets.filter((s) => s.selected).reduce((n, s) => n + s.rows.length, 0),
    0,
  );

  const uploadBatch = async (
    contacts: ContactImportRow[],
    opts: {
      fileName: string;
      sheetName?: string;
      importBatchId: string;
      finalize: boolean;
      recordsCount: number;
    },
  ) => {
    const chunks = chunkArray(contacts, CHUNK_SIZE);
    let imported = 0;
    let updated = 0;

    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === chunks.length - 1;
      setProgress(
        `${opts.fileName}${opts.sheetName ? ` · ${opts.sheetName}` : ""}, chunk ${i + 1}/${chunks.length}`,
      );

      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: chunks[i],
          file_name: opts.fileName,
          sheet_name: opts.sheetName,
          import_batch_id: opts.importBatchId,
          finalize: opts.finalize && isLast,
          records_count: opts.finalize && isLast ? opts.recordsCount : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      imported += data.imported ?? 0;
      updated += data.updated ?? 0;
    }

    return { imported, updated };
  };

  const handleImport = async () => {
    if (prepared.length === 0 || selectedContactCount === 0) return;

    setImporting(true);
    let totalImported = 0;
    let totalUpdated = 0;

    try {
      for (const item of prepared) {
        const activeSheets = item.sheets.filter((s) => s.selected && s.rows.length > 0);
        for (const sheet of activeSheets) {
          const importBatchId = `csv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const result = await uploadBatch(sheet.rows, {
            fileName: item.file.name,
            sheetName:
              item.sheets.length > 1 || !item.file.name.toLowerCase().endsWith(".csv")
                ? sheet.name
                : undefined,
            importBatchId,
            finalize: true,
            recordsCount: sheet.rows.length,
          });
          totalImported += result.imported;
          totalUpdated += result.updated;
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["contacts"] });
      await queryClient.invalidateQueries({ queryKey: ["connectors"] });
      onImported?.();
      toast.success(
        `Imported ${totalImported.toLocaleString()} new` +
          (totalUpdated ? `, updated ${totalUpdated.toLocaleString()}` : "") +
          " contacts",
      );
      handleOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setImporting(false);
      setProgress(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    void addFiles(e.dataTransfer.files);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Upload className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-6 py-5 pr-12">
          <DialogTitle className="font-display text-xl">Import contacts</DialogTitle>
          <DialogDescription>
            Upload CSV / Excel with Apollo-style enrichment. We store every mapped column and use it
            for lead scoring, search, AI summaries, and contact details, not just name and email.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {CONTACT_CSV_COLUMNS.map((col) => (
                <span
                  key={col}
                  className="rounded-full border border-border bg-secondary/50 px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  {col}
                </span>
              ))}
              <span className="rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                +45 enrichment fields
              </span>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={TEMPLATE_URL} download="contacts-template.csv">
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Template CSV
              </a>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Download the template for the full set (seniority, industry, phones, LinkedIn, funding,
            location, etc.). Those fields power lead scores, search ranking, and AI summaries.
            Empty cells are fine. Each row needs a name (or first + last) or an email.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            multiple
            className="sr-only"
            onChange={(e) => {
              void addFiles(e.target.files);
              e.target.value = "";
            }}
          />

          {prepared.length === 0 ? (
            <button
              type="button"
              disabled={importing || parsing}
              onClick={() => inputRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setIsDragging(false);
                }
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className={cn(
                "flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/40 hover:bg-secondary/30",
              )}
            >
              <div
                className={cn(
                  "mb-4 flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                  isDragging ? "bg-primary/15" : "bg-secondary",
                )}
              >
                {parsing ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <Upload
                    className={cn("h-5 w-5", isDragging ? "text-primary" : "text-muted-foreground")}
                  />
                )}
              </div>
              <p className="text-sm font-medium text-foreground">
                {parsing
                  ? "Reading files…"
                  : isDragging
                    ? "Drop files here"
                    : "Drag & drop CSV or Excel files"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">or</p>
              <span className="mt-3 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm">
                Browse files
              </span>
              <p className="mt-3 text-xs text-muted-foreground">
                Multiple files · CSV / XLSX · up to 50 MB each
              </p>
            </button>
          ) : (
            <div className="space-y-3">
              {prepared.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border bg-secondary/30 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileSpreadsheet className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(item.file.size)} ·{" "}
                        {item.sheets
                          .filter((s) => s.selected)
                          .reduce((n, s) => n + s.rows.length, 0)
                          .toLocaleString()}{" "}
                        contacts
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() =>
                        setPrepared((prev) => prev.filter((p) => p.id !== item.id))
                      }
                      disabled={importing}
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {item.sheets.length > 1 && (
                    <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        Sheets to import
                      </p>
                      {item.sheets.map((sheet) => (
                        <label
                          key={sheet.name}
                          className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 text-sm"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <input
                              type="checkbox"
                              checked={sheet.selected}
                              disabled={importing || sheet.rows.length === 0}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setPrepared((prev) =>
                                  prev.map((p) =>
                                    p.id !== item.id
                                      ? p
                                      : {
                                          ...p,
                                          sheets: p.sheets.map((s) =>
                                            s.name === sheet.name
                                              ? { ...s, selected: checked }
                                              : s,
                                          ),
                                        },
                                  ),
                                );
                              }}
                            />
                            <span className="truncate">{sheet.name}</span>
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {sheet.rows.length === 0
                              ? "no contact columns"
                              : `${sheet.rows.length.toLocaleString()} rows`}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={importing || parsing}
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Add more files
              </Button>
            </div>
          )}

          {(importing || progress) && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              <span className="min-w-0 truncate">{progress ?? "Importing contacts…"}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-6 py-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={importing}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleImport()}
            disabled={prepared.length === 0 || selectedContactCount === 0 || importing || parsing}
          >
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import {selectedContactCount > 0 ? selectedContactCount.toLocaleString() : ""}{" "}
                contacts
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
