"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CSV_COLUMNS = ["name", "email", "title", "company"];

function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = headers.findIndex((h) => ["name", "full_name", "full name"].includes(h));
  const emailIdx = headers.findIndex((h) => h === "email");
  const titleIdx = headers.findIndex((h) => h === "title");
  const companyIdx = headers.findIndex((h) => ["company", "company_name", "company name"].includes(h));

  return lines.slice(1).flatMap((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const full_name = cols[nameIdx >= 0 ? nameIdx : 0];
    if (!full_name) return [];

    return [
      {
        full_name,
        email: emailIdx >= 0 ? cols[emailIdx] : undefined,
        title: titleIdx >= 0 ? cols[titleIdx] : undefined,
        company_name: companyIdx >= 0 ? cols[companyIdx] : undefined,
      },
    ];
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CsvImportButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const queryClient = useQueryClient();

  const resetSelection = () => {
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      resetSelection();
      setIsDragging(false);
    }
  };

  const selectFile = (file: File | undefined) => {
    if (!file) return;

    const isCsv =
      file.name.toLowerCase().endsWith(".csv") ||
      file.type === "text/csv" ||
      file.type === "application/vnd.ms-excel";

    if (!isCsv) {
      toast.error("Please choose a .csv file");
      return;
    }

    setSelectedFile(file);
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    try {
      const text = await selectedFile.text();
      const contacts = parseCsv(text);

      if (contacts.length === 0) {
        toast.error("No contacts found in CSV. Use columns: name, email, title, company");
        return;
      }

      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      await queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(data.message);
      handleOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    selectFile(e.dataTransfer.files?.[0]);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border px-6 py-5 pr-12">
          <DialogTitle className="font-display text-xl">Import contacts</DialogTitle>
          <DialogDescription>
            Upload a spreadsheet to add people to your network.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <div className="flex flex-wrap gap-2">
            {CSV_COLUMNS.map((col) => (
              <span
                key={col}
                className="rounded-full border border-border bg-secondary/50 px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
              >
                {col}
              </span>
            ))}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => selectFile(e.target.files?.[0])}
          />

          {!selectedFile ? (
            <button
              type="button"
              disabled={importing}
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
                <Upload
                  className={cn("h-5 w-5", isDragging ? "text-primary" : "text-muted-foreground")}
                />
              </div>
              <p className="text-sm font-medium text-foreground">
                {isDragging ? "Drop your CSV here" : "Drag & drop your CSV file"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">or</p>
              <span className="mt-3 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm">
                Browse files
              </span>
              <p className="mt-3 text-xs text-muted-foreground">CSV only · Max recommended 5 MB</p>
            </button>
          ) : (
            <div className="rounded-xl border border-border bg-secondary/30 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)} · CSV
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={resetSelection}
                  disabled={importing}
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {importing && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Importing contacts...
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-6 py-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!selectedFile || importing}>
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import contacts
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
