"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  FaFilePdf,
  FaFileImage,
  FaFileVideo,
  FaFileAlt,
  FaFileCode,
  FaCloudUploadAlt,
  FaTimes,
  FaCheckCircle,
  FaExclamationCircle,
  FaShieldAlt,
  FaArrowRight,
} from "react-icons/fa";

export type FileStatus = "queued" | "uploading" | "done" | "error";

export interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: FileStatus;
}

export interface FileUploaderProps {
  /** Card heading */
  title?: string;
  /** Card sub-heading */
  description?: string;
  /** Maximum number of files allowed */
  maxFiles?: number;
  /** Maximum individual file size in MB */
  maxSizeMB?: number;
  /** Human-readable label for accepted formats */
  acceptedLabel?: string;
  /** HTML file accept pattern (e.g. "image/*,.pdf") */
  accept?: string;
  /** Whether multiple files are allowed (defaults to maxFiles > 1) */
  multiple?: boolean;
  /** Submit button label */
  submitLabel?: string;
  /** Cancel / discard button label */
  cancelLabel?: string;
  /** Whether to wrap the component in a shadcn Card */
  showCard?: boolean;
  /** Whether to render the header section */
  showHeader?: boolean;
  /** Whether to render the footer action buttons */
  showFooter?: boolean;
  /** Whether to display the 256-bit encrypted security badge */
  showEncryptionBadge?: boolean;
  /** Compact sizing variant for tight forms, inline panels, and modals */
  compact?: boolean;
  /** Additional custom class names */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Fired whenever files change (added, removed, or cleared) */
  onFilesChange?: (files: File[]) => void;
  /** Fired with the current single file or null (convenient for single-file forms) */
  onFileSelect?: (file: File | null) => void;
  /** Controlled or initial single file or list of files */
  value?: File[] | File | null;
  /** Fired when the user clicks submit (receives only "done" files) */
  onSubmit?: (files: File[]) => void;
  /** Fired when the user clicks cancel */
  onCancel?: () => void;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"] as const;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function FileIcon({ file }: { file: File }): React.ReactElement {
  const type = file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (type.startsWith("image/")) return <FaFileImage className="size-4" />;
  if (type.startsWith("video/")) return <FaFileVideo className="size-4" />;
  if (type === "application/pdf" || ext === "pdf")
    return <FaFilePdf className="size-4" />;
  if (
    ["js", "ts", "tsx", "jsx", "py", "go", "json", "yaml", "yml"].includes(ext)
  )
    return <FaFileCode className="size-4" />;
  return <FaFileAlt className="size-4" />;
}

export function FileUploader({
  title,
  description,
  maxFiles = 6,
  maxSizeMB = 25,
  acceptedLabel = "PDF, DOCX, XLSX, CSV · up to 25 MB each",
  accept,
  multiple,
  submitLabel = "Submit",
  cancelLabel = "Discard",
  showCard = true,
  showHeader,
  showFooter,
  showEncryptionBadge = true,
  compact = false,
  className,
  disabled = false,
  onFilesChange,
  onFileSelect,
  value,
  onSubmit,
  onCancel,
}: FileUploaderProps) {
  const [files, setFiles] = React.useState<UploadedFile[]>(() => {
    if (!value) return [];
    const arr = Array.isArray(value) ? value : [value];
    return arr.filter(Boolean).map((file) => ({
      id: generateId(),
      file,
      progress: 100,
      status: "done" as const,
    }));
  });
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dragCounter = React.useRef(0);

  // Sync external value when it is reset to null/empty
  React.useEffect(() => {
    if (value === null || value === undefined) {
      if (files.length > 0 && !files.some((f) => f.status === "uploading")) {
        setFiles([]);
      }
    }
  }, [value]);

  const totalSize = files.reduce((acc, f) => acc + f.file.size, 0);
  const allDone = files.length > 0 && files.every((f) => f.status === "done");
  const hasUploading = files.some(
    (f) => f.status === "uploading" || f.status === "queued",
  );
  const isAtLimit = files.length >= maxFiles;
  const allowMultiple = multiple ?? maxFiles > 1;

  const renderHeader =
    showHeader !== undefined ? showHeader : Boolean(title || description);
  const renderFooter =
    showFooter !== undefined
      ? showFooter
      : Boolean(onSubmit || onCancel || submitLabel);

  function simulateUpload(id: string): void {
    let progress = 0;

    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: "uploading" } : f)),
    );

    const interval = setInterval(() => {
      progress += Math.random() * 25 + 15;

      if (progress >= 100) {
        clearInterval(interval);
        setFiles((prev) => {
          const next = prev.map((f) =>
            f.id === id ? { ...f, progress: 100, status: "done" as const } : f,
          );
          return next;
        });
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, progress: Math.min(progress, 99) } : f,
          ),
        );
      }
    }, 100);
  }

  function addFiles(incoming: FileList | File[]): void {
    if (disabled) return;
    const fileArray = Array.from(incoming);

    if (maxFiles === 1) {
      // Single file mode: replacing existing
      const candidate = fileArray[0];
      if (!candidate || candidate.size > maxSizeMB * 1024 * 1024) return;
      const newEntry: UploadedFile = {
        id: generateId(),
        file: candidate,
        progress: 0,
        status: "queued",
      };
      setFiles([newEntry]);
      onFilesChange?.([candidate]);
      onFileSelect?.(candidate);
      setTimeout(() => simulateUpload(newEntry.id), 50);
      return;
    }

    const remaining = maxFiles - files.length;
    const toAdd: UploadedFile[] = fileArray
      .filter((f) => f.size <= maxSizeMB * 1024 * 1024)
      .slice(0, remaining)
      .map((file) => ({
        id: generateId(),
        file,
        progress: 0,
        status: "queued",
      }));

    if (toAdd.length === 0) return;

    const nextFiles = [...files, ...toAdd];
    setFiles(nextFiles);
    onFilesChange?.(nextFiles.map((f) => f.file));
    onFileSelect?.(nextFiles[0]?.file ?? null);

    toAdd.forEach((f) => {
      setTimeout(() => simulateUpload(f.id), 50);
    });
  }

  function removeFile(id: string): void {
    const nextFiles = files.filter((f) => f.id !== id);
    setFiles(nextFiles);
    onFilesChange?.(nextFiles.map((f) => f.file));
    onFileSelect?.(nextFiles[0]?.file ?? null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function clearAll(): void {
    setFiles([]);
    onFilesChange?.([]);
    onFileSelect?.(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDragEnter(e: React.DragEvent): void {
    e.preventDefault();
    if (disabled) return;
    dragCounter.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent): void {
    e.preventDefault();
    if (disabled) return;
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragging(false);
  }

  function handleDragOver(e: React.DragEvent): void {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent): void {
    e.preventDefault();
    if (disabled) return;
    dragCounter.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
    if (e.target.files?.length) addFiles(e.target.files);
  }

  function handleSubmit(): void {
    onSubmit?.(files.filter((f) => f.status === "done").map((f) => f.file));
  }

  const headerContent = renderHeader ? (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        {title && (
          <h2 className="text-foreground text-sm sm:text-base leading-snug font-semibold tracking-tight">
            {title}
          </h2>
        )}
        {description && (
          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {files.length > 0 && maxFiles > 1 && (
        <span className="shrink-0 tabular-nums text-xs font-bold text-primary">
          {files.length}&nbsp;/&nbsp;{maxFiles}
        </span>
      )}
    </div>
  ) : null;

  const bodyContent = (
    <div className="flex flex-col gap-3">
      {(!isAtLimit || maxFiles === 1) && (
        <button
          type="button"
          id="file-upload-drop-zone"
          aria-label="Drag and drop files or click to browse"
          disabled={disabled}
          className={cn(
            "focus-visible:ring-ring relative flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            compact ? "gap-2 py-4 px-3" : "gap-3 py-6 sm:py-8 px-4",
            disabled && "opacity-50 cursor-not-allowed",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/40 hover:border-primary/50 hover:bg-muted/60",
          )}
          onClick={() => !disabled && inputRef.current?.click()}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div
            className={cn(
              "flex items-center justify-center rounded-xl border transition-colors duration-200",
              compact ? "size-9" : "size-11",
              isDragging
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground",
            )}
          >
            <FaCloudUploadAlt className={compact ? "size-4" : "size-5"} />
          </div>

          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-foreground text-xs sm:text-sm font-medium">
              {isDragging
                ? "Release to add file"
                : compact
                  ? "Drag & drop or browse file"
                  : "Drag & drop or click to browse"}
            </p>
            <p className="text-muted-foreground text-[11px] sm:text-xs">{acceptedLabel}</p>
          </div>
        </button>
      )}

      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map((uf) => (
            <div
              key={uf.id}
              className="bg-muted/40 border-border flex flex-col gap-2 rounded-lg border px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "shrink-0",
                    uf.status === "error"
                      ? "text-destructive"
                      : uf.status === "done"
                        ? "text-primary"
                        : "text-muted-foreground",
                  )}
                >
                  <FileIcon file={uf.file} />
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="text-foreground truncate text-xs sm:text-sm leading-none font-medium">
                    {uf.file.name}
                  </p>
                  <p className="text-muted-foreground text-[11px] sm:text-xs">
                    {formatBytes(uf.file.size)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {uf.status === "done" && (
                    <FaCheckCircle className="text-primary size-3.5" />
                  )}
                  {uf.status === "error" && (
                    <FaExclamationCircle className="text-destructive size-3.5" />
                  )}
                  {(uf.status === "uploading" || uf.status === "queued") && (
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {Math.round(uf.progress)}%
                    </span>
                  )}

                  <button
                    type="button"
                    id={`remove-file-${uf.id}`}
                    aria-label={`Remove ${uf.file.name}`}
                    disabled={disabled}
                    onClick={() => removeFile(uf.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors duration-150 p-1 rounded-md"
                  >
                    <FaTimes className="size-3.5" />
                  </button>
                </div>
              </div>

              {(uf.status === "uploading" || uf.status === "queued") && (
                <Progress value={uf.progress} className="h-1" />
              )}
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {files.length} file{files.length !== 1 ? "s" : ""}&nbsp;·&nbsp;
            {formatBytes(totalSize)} total
          </span>
          {!hasUploading && (
            <button
              type="button"
              id="file-upload-clear-all"
              disabled={disabled}
              onClick={clearAll}
              className="text-muted-foreground hover:text-foreground text-xs transition-colors duration-150 underline"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );

  const footerContent = renderFooter ? (
    <div className="flex items-center justify-between gap-3 w-full">
      {showEncryptionBadge ? (
        <div className="text-muted-foreground flex items-center gap-1.5">
          <FaShieldAlt className="size-3 text-primary/80" />
          <span className="text-[11px] sm:text-xs">256-bit encrypted</span>
        </div>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-2">
        {onCancel && (
          <Button
            id="file-upload-cancel"
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
        )}

        {onSubmit && (
          <Button
            id="file-upload-submit"
            type="button"
            variant="default"
            size="sm"
            disabled={disabled || !allDone}
            onClick={handleSubmit}
            className="gap-1.5"
          >
            {submitLabel}
            <FaArrowRight className="size-3" />
          </Button>
        )}
      </div>
    </div>
  ) : null;

  const hiddenInput = (
    <input
      ref={inputRef}
      id="file-upload-input"
      type="file"
      accept={accept}
      multiple={allowMultiple}
      disabled={disabled}
      className="sr-only"
      onChange={handleInputChange}
      aria-hidden="true"
    />
  );

  if (!showCard) {
    return (
      <div className={cn("w-full flex flex-col gap-3", className)}>
        {headerContent}
        {bodyContent}
        {footerContent}
        {hiddenInput}
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "w-full shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] ring-0",
        className,
      )}
    >
      {headerContent && <CardHeader className="pb-2">{headerContent}</CardHeader>}
      <CardContent className={cn("flex flex-col gap-4", !headerContent && "pt-6")}>
        {bodyContent}
      </CardContent>
      {footerContent && (
        <CardFooter className="border-t border-border/60 pt-4">
          {footerContent}
        </CardFooter>
      )}
      {hiddenInput}
    </Card>
  );
}

export default FileUploader;
