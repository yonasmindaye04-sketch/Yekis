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
import { FaShieldAlt, FaArrowRight } from "react-icons/fa";
import { type Language, useI18n } from "@/i18n";
import "./file-upload-1.css";

type FileUploadCopy = {
  unsupportedFormat: (accepted: string) => string;
  fileTooLarge: (maxMB: number) => string;
  previewAlt: (name: string) => string;
  defaultAcceptedLabel: string;
  defaultSubmitLabel: string;
  defaultCancelLabel: string;
  maxFilesAllowed: (max: number) => string;
  onlyFilesAtOnce: (max: number) => string;
  attachUpTo: (max: number) => string;
  selectClearFile: string;
  readyToSubmit: string;
  uploadFailed: string;
  preparing: (pct: number) => string;
  replace: string;
  removeAria: (name: string) => string;
  releaseMultiple: string;
  releaseSingle: string;
  dragDropPrefix: string;
  browseFiles: string;
  browseFile: string;
  filesSummary: (count: number, sizeText: string) => string;
  clear: string;
  encryptedBadge: string;
};

const FILE_UPLOAD_COPY: Record<Language, FileUploadCopy> = {
  en: {
    unsupportedFormat: (accepted) => `Unsupported format — accepted: ${accepted}.`,
    fileTooLarge: (maxMB) => `File is larger than ${maxMB} MB — please upload a smaller file.`,
    previewAlt: (name) => `${name} preview`,
    defaultAcceptedLabel: "PDF, DOCX, XLSX, CSV · up to 25 MB each",
    defaultSubmitLabel: "Submit",
    defaultCancelLabel: "Discard",
    maxFilesAllowed: (max) => `Maximum ${max} files allowed.`,
    onlyFilesAtOnce: (max) => `Only ${max} files can be attached at once.`,
    attachUpTo: (max) => `Attach up to ${max} files`,
    selectClearFile: "Select a clear image or document to upload",
    readyToSubmit: "Ready to submit",
    uploadFailed: "Upload failed",
    preparing: (pct) => `Preparing · ${pct}%`,
    replace: "Replace",
    removeAria: (name) => `Remove ${name}`,
    releaseMultiple: "Release to add files",
    releaseSingle: "Release to add file",
    dragDropPrefix: "Drag & drop or ",
    browseFiles: "browse files",
    browseFile: "browse file",
    filesSummary: (count, sizeText) => `${count} file${count !== 1 ? "s" : ""} · ${sizeText} total`,
    clear: "Clear",
    encryptedBadge: "256-bit encrypted",
  },
  am: {
    unsupportedFormat: (accepted) => `የማይደገፍ ቅርጸት — የሚቀበለው፡ ${accepted}።`,
    fileTooLarge: (maxMB) => `ፋይሉ ከ${maxMB} MB በላይ ነው — እባክዎ አነስ ያለ ፋይል ይጫኑ።`,
    previewAlt: (name) => `የ${name} ቅድመ-ዕይታ`,
    defaultAcceptedLabel: "PDF፣ DOCX፣ XLSX፣ CSV · እያንዳንዳቸው እስከ 25 MB",
    defaultSubmitLabel: "አስገባ",
    defaultCancelLabel: "ተው",
    maxFilesAllowed: (max) => `ከፍተኛው ${max} ፋይሎች ብቻ ይፈቀዳሉ።`,
    onlyFilesAtOnce: (max) => `በአንድ ጊዜ ${max} ፋይሎች ብቻ ማያያዝ ይቻላል።`,
    attachUpTo: (max) => `እስከ ${max} ፋይሎች ያያይዙ`,
    selectClearFile: "ለመጫን ግልጽ የሆነ ምስል ወይም ሰነድ ይምረጡ",
    readyToSubmit: "ለማስገባት ዝግጁ ነው",
    uploadFailed: "መጫን አልተሳካም",
    preparing: (pct) => `በማዘጋጀት ላይ · ${pct}%`,
    replace: "ቀይር",
    removeAria: (name) => `${name}ን አስወግድ`,
    releaseMultiple: "ፋይሎቹን ለመጨመር ይልቀቁ",
    releaseSingle: "ፋይሉን ለመጨመር ይልቀቁ",
    dragDropPrefix: "ጎትተው ያስቀምጡ ወይም ",
    browseFiles: "ፋይሎችን ይምረጡ",
    browseFile: "ፋይል ይምረጡ",
    filesSummary: (count, sizeText) => `${count} ፋይል · ጠቅላላ ${sizeText}`,
    clear: "አጽዳ",
    encryptedBadge: "ባለ 256-ቢት ምስጠራ",
  },
  om: {
    unsupportedFormat: (accepted) => `Bifa hin deeggaramne — kan fudhatamu: ${accepted}.`,
    fileTooLarge: (maxMB) => `Faayilichi MB ${maxMB} caala — maaloo faayilii xiqqaa fe'aa.`,
    previewAlt: (name) => `Dur-argii ${name}`,
    defaultAcceptedLabel: "PDF, DOCX, XLSX, CSV · tokkoon tokkoo hanga MB 25",
    defaultSubmitLabel: "Ergi",
    defaultCancelLabel: "Dhiisi",
    maxFilesAllowed: (max) => `Baay'inni ol-aanaan faayilootaa ${max} dha.`,
    onlyFilesAtOnce: (max) => `Yeroo tokkotti faayiloota ${max} qofa maxxansuun danda'ama.`,
    attachUpTo: (max) => `Hanga faayiloota ${max} maxxansaa`,
    selectClearFile: "Fe'uuf suuraa ykn sanada ifaa filadhaa",
    readyToSubmit: "Erguuf qophii dha",
    uploadFailed: "Fe'uun hin milkoofne",
    preparing: (pct) => `Qopheessaa jira · ${pct}%`,
    replace: "Bakka buusi",
    removeAria: (name) => `${name} balleessi`,
    releaseMultiple: "Faayiloota dabaluuf gadhiisaa",
    releaseSingle: "Faayilii dabaluuf gadhiisaa",
    dragDropPrefix: "Harkisaatii kaa'aa ykn ",
    browseFiles: "faayiloota filadhaa",
    browseFile: "faayilii filadhaa",
    filesSummary: (count, sizeText) => `Faayilii ${count} · waliigala ${sizeText}`,
    clear: "Qulqulleessi",
    encryptedBadge: "Icciiteessa 256-bit",
  },
  ti: {
    unsupportedFormat: (accepted) => `ዘይድገፍ ቅርጺ — ዝቕበሎ፡ ${accepted}።`,
    fileTooLarge: (maxMB) => `እቲ ፋይል ልዕሊ ${maxMB} MB እዩ — በጃኹም ዝነኣሰ ፋይል ጽዓኑ።`,
    previewAlt: (name) => `ቅድመ-ርኢት ${name}`,
    defaultAcceptedLabel: "PDF፣ DOCX፣ XLSX፣ CSV · ነፍሲ ወከፍ ክሳብ 25 MB",
    defaultSubmitLabel: "ኣቕርብ",
    defaultCancelLabel: "ስረዝ",
    maxFilesAllowed: (max) => `ዝለዓለ ${max} ፋይላት ጥራይ ይፍቀዱ።`,
    onlyFilesAtOnce: (max) => `ብሓንሳብ ${max} ፋይላት ጥራይ ምትሕሓዝ ይከኣል።`,
    attachUpTo: (max) => `ክሳብ ${max} ፋይላት ኣተሓሕዙ`,
    selectClearFile: "ንምጽዓን ንጹር ስእሊ ወይ ሰነድ ምረጹ",
    readyToSubmit: "ንምቕራብ ድሉው እዩ",
    uploadFailed: "ምጽዓን ኣይተሳኸዐን",
    preparing: (pct) => `የዳሉ ኣሎ · ${pct}%`,
    replace: "ቀይር",
    removeAria: (name) => `${name} ኣልግስ`,
    releaseMultiple: "ፋይላት ንምውሳኽ ልቐቑ",
    releaseSingle: "ፋይል ንምውሳኽ ልቐቑ",
    dragDropPrefix: "ስሒብኩም ኣቐምጡ ወይ ",
    browseFiles: "ፋይላት ምረጹ",
    browseFile: "ፋይል ምረጹ",
    filesSummary: (count, sizeText) => `${count} ፋይል · ድምር ${sizeText}`,
    clear: "ኣጽሪ",
    encryptedBadge: "ብ256-ቢት ዝተመስጠረ",
  },
};

export type FileStatus = "queued" | "uploading" | "done" | "error";

export interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: FileStatus;
}

export interface FileUploaderProps {
  /** Card heading (when showCard / showHeader is used) */
  title?: string;
  /** Card sub-heading (when showCard / showHeader is used) */
  description?: string;
  /** Field label rendered above the dropzone on the left (Fayda-style header row) */
  label?: string;
  /** Helper subtitle rendered inside the empty dropzone beneath the action prompt */
  dropSubtitle?: string;
  /** External validation error message */
  error?: string;
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
  /** Whether to render the card header section */
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
  const val = bytes / Math.pow(k, i);
  return `${i <= 1 ? Math.round(val) : parseFloat(val.toFixed(1))} ${sizes[i]}`;
}

function isImageFile(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif|avif)$/i.test(file.name)
  );
}

function matchesAcceptToken(file: File, token: string): boolean {
  const t = token.trim().toLowerCase();
  if (!t || t === "*" || t === "*/*") return true;
  const fileName = file.name.toLowerCase();
  const mime = file.type.toLowerCase();

  if (t.startsWith(".")) {
    if (fileName.endsWith(t)) return true;
    if (t === ".jpg" || t === ".jpeg") return mime === "image/jpeg";
    if (t === ".png") return mime === "image/png";
    if (t === ".webp") return mime === "image/webp";
    if (t === ".pdf") return mime === "application/pdf";
    return false;
  }

  if (t.endsWith("/*")) {
    const prefix = t.slice(0, -1);
    if (mime.startsWith(prefix)) return true;
    if (prefix === "image/") {
      return /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(fileName);
    }
    if (prefix === "video/") {
      return /\.(mp4|webm|mov|avi|mkv)$/i.test(fileName);
    }
    return false;
  }

  return mime === t;
}

function validateIncomingFile(
  file: File,
  accept: string | undefined,
  maxSizeMB: number,
  acceptedLabel: string,
  copy: FileUploadCopy,
): string | null {
  if (accept) {
    const tokens = accept
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (tokens.length > 0 && !tokens.some((tok) => matchesAcceptToken(file, tok))) {
      return copy.unsupportedFormat(acceptedLabel);
    }
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return copy.fileTooLarge(maxSizeMB);
  }
  return null;
}

function sameFileArray(a: File[], b: File[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function FileThumb({
  file,
  alt,
}: {
  file: File;
  alt: string;
}): React.ReactElement {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const isImage = isImageFile(file);

  React.useEffect(() => {
    if (!isImage) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file, isImage]);

  if (previewUrl) {
    return <img src={previewUrl} alt={alt} />;
  }

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}

export function FileUploader({
  title,
  description,
  label,
  dropSubtitle,
  error,
  maxFiles = 6,
  maxSizeMB = 25,
  acceptedLabel,
  accept,
  multiple,
  submitLabel,
  cancelLabel,
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
  const { language } = useI18n();
  const copy = FILE_UPLOAD_COPY[language] ?? FILE_UPLOAD_COPY.en;
  const resolvedAcceptedLabel = acceptedLabel ?? copy.defaultAcceptedLabel;
  const resolvedSubmitLabel = submitLabel ?? copy.defaultSubmitLabel;
  const resolvedCancelLabel = cancelLabel ?? copy.defaultCancelLabel;

  const uid = React.useId();
  const labelId = `${uid}-label`;
  const titleId = `${uid}-title`;
  const subId = `${uid}-sub`;
  const errorId = `${uid}-error`;
  const inputId = `${uid}-input`;

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
  const [validationError, setValidationError] = React.useState<string | null>(
    null,
  );
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dragCounter = React.useRef(0);
  const intervalsRef = React.useRef<Map<string, ReturnType<typeof setInterval>>>(
    new Map(),
  );

  const clearEntryInterval = React.useCallback((id: string) => {
    const existing = intervalsRef.current.get(id);
    if (existing) {
      clearInterval(existing);
      intervalsRef.current.delete(id);
    }
  }, []);

  const clearAllIntervals = React.useCallback(() => {
    intervalsRef.current.forEach((timer) => clearInterval(timer));
    intervalsRef.current.clear();
  }, []);

  React.useEffect(() => {
    return () => {
      clearAllIntervals();
    };
  }, [clearAllIntervals]);

  // Keep controlled `value` in sync when parent resets or supplies files
  React.useEffect(() => {
    if (value === undefined) return;
    const incoming =
      value === null
        ? []
        : (Array.isArray(value) ? value : [value]).filter(Boolean);

    setFiles((prev) => {
      const prevFiles = prev.map((f) => f.file);
      if (sameFileArray(prevFiles, incoming)) return prev;

      if (incoming.length === 0) {
        clearAllIntervals();
        if (inputRef.current) inputRef.current.value = "";
        return [];
      }

      const prevByFile = new Map(prev.map((entry) => [entry.file, entry]));
      return incoming.map((file) => {
        const match = prevByFile.get(file);
        if (match) return match;
        return {
          id: generateId(),
          file,
          progress: 100,
          status: "done" as const,
        };
      });
    });
  }, [value, clearAllIntervals]);

  const totalSize = files.reduce((acc, f) => acc + f.file.size, 0);
  const allDone = files.length > 0 && files.every((f) => f.status === "done");
  const hasUploading = files.some(
    (f) => f.status === "uploading" || f.status === "queued",
  );
  const isAtLimit = files.length >= maxFiles;
  const allowMultiple = multiple ?? maxFiles > 1;
  const activeError = error || validationError;

  const renderHeader =
    showHeader !== undefined ? showHeader : Boolean(title || description);
  const renderFooter =
    showFooter !== undefined
      ? showFooter
      : Boolean(onSubmit || onCancel || resolvedSubmitLabel);

  function simulateUpload(id: string): void {
    clearEntryInterval(id);
    let progress = 0;

    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: "uploading" } : f)),
    );

    const interval = setInterval(() => {
      progress += Math.random() * 30 + 25;

      if (progress >= 100) {
        clearEntryInterval(id);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, progress: 100, status: "done" as const } : f,
          ),
        );
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, progress: Math.min(progress, 99) } : f,
          ),
        );
      }
    }, 90);

    intervalsRef.current.set(id, interval);
  }

  function addFiles(incoming: FileList | File[]): void {
    if (disabled) return;
    const fileArray = Array.from(incoming);
    if (fileArray.length === 0) return;

    if (maxFiles === 1) {
      const candidate = fileArray[0];
      if (!candidate) return;
      const err = validateIncomingFile(
        candidate,
        accept,
        maxSizeMB,
        resolvedAcceptedLabel,
        copy,
      );
      if (err) {
        setValidationError(err);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      clearAllIntervals();
      setValidationError(null);
      const newEntry: UploadedFile = {
        id: generateId(),
        file: candidate,
        progress: 0,
        status: "queued",
      };
      setFiles([newEntry]);
      onFilesChange?.([candidate]);
      onFileSelect?.(candidate);
      setTimeout(() => simulateUpload(newEntry.id), 40);
      return;
    }

    const remaining = maxFiles - files.length;
    if (remaining <= 0) {
      setValidationError(copy.maxFilesAllowed(maxFiles));
      return;
    }

    let firstError: string | null = null;
    const validFiles: File[] = [];
    for (const file of fileArray) {
      const err = validateIncomingFile(
        file,
        accept,
        maxSizeMB,
        resolvedAcceptedLabel,
        copy,
      );
      if (err) {
        if (!firstError) firstError = err;
      } else {
        validFiles.push(file);
      }
    }

    const sliced = validFiles.slice(0, remaining);
    if (validFiles.length > remaining && !firstError) {
      firstError = copy.onlyFilesAtOnce(maxFiles);
    }

    setValidationError(firstError);
    if (sliced.length === 0) {
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const toAdd: UploadedFile[] = sliced.map((file) => ({
      id: generateId(),
      file,
      progress: 0,
      status: "queued",
    }));

    const nextFiles = [...files, ...toAdd];
    setFiles(nextFiles);
    onFilesChange?.(nextFiles.map((f) => f.file));
    onFileSelect?.(nextFiles[0]?.file ?? null);

    toAdd.forEach((f) => {
      setTimeout(() => simulateUpload(f.id), 40);
    });
  }

  function removeFile(id: string): void {
    clearEntryInterval(id);
    const nextFiles = files.filter((f) => f.id !== id);
    setFiles(nextFiles);
    setValidationError(null);
    onFilesChange?.(nextFiles.map((f) => f.file));
    onFileSelect?.(nextFiles[0]?.file ?? null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function clearAll(): void {
    clearAllIntervals();
    setFiles([]);
    setValidationError(null);
    onFilesChange?.([]);
    onFileSelect?.(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDragEnter(e: React.DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragCounter.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setIsDragging(false);
  }

  function handleDragOver(e: React.DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragCounter.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
    if (e.target.files?.length) addFiles(e.target.files);
  }

  function handleSubmit(): void {
    onSubmit?.(files.filter((f) => f.status === "done").map((f) => f.file));
  }

  const singleFile = maxFiles === 1 ? files[0] : undefined;
  const resolvedSubtitle =
    dropSubtitle ??
    (label
      ? allowMultiple
        ? copy.attachUpTo(maxFiles)
        : copy.selectClearFile
      : resolvedAcceptedLabel);
  const showLabelRow = Boolean(label || dropSubtitle);
  const describedByIds = [subId, activeError ? errorId : null]
    .filter(Boolean)
    .join(" ");

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

  const renderFileItem = (uf: UploadedFile, allowReplace: boolean) => (
    <>
      <div className="yk-file">
        <div className="yk-file-thumb">
          <FileThumb file={uf.file} alt={copy.previewAlt(uf.file.name)} />
        </div>
        <div className="yk-file-meta">
          <p className="yk-file-name">{uf.file.name}</p>
          <p className="yk-file-status">
            <span>{formatBytes(uf.file.size)}</span>
            <span aria-hidden="true">·</span>
            {uf.status === "done" && (
              <span className="yk-file-ok">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m4.5 12.5 5 5 10-11" />
                </svg>
                {copy.readyToSubmit}
              </span>
            )}
            {uf.status === "error" && (
              <span className="yk-file-err">{copy.uploadFailed}</span>
            )}
            {(uf.status === "uploading" || uf.status === "queued") && (
              <span className="tabular-nums">
                {copy.preparing(Math.round(uf.progress))}
              </span>
            )}
          </p>
        </div>
        <div className="yk-file-actions">
          {allowReplace && (
            <button
              type="button"
              className="yk-file-replace"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              {copy.replace}
            </button>
          )}
          <button
            type="button"
            className="yk-file-remove"
            aria-label={copy.removeAria(uf.file.name)}
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              removeFile(uf.id);
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>

      {(uf.status === "uploading" || uf.status === "queued") && (
        <div className="yk-file-progress">
          <Progress value={uf.progress} className="h-1" />
        </div>
      )}
    </>
  );

  const dropEmptyContent = (
    <div className="yk-drop-empty">
      <div className="yk-drop-icon" aria-hidden="true">
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 14.9A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.24" />
          <path d="M12 12v9" />
          <path d="m16 16-4-4-4 4" />
        </svg>
      </div>
      <p className="yk-drop-title" id={titleId}>
        {isDragging ? (
          allowMultiple ? (
            copy.releaseMultiple
          ) : (
            copy.releaseSingle
          )
        ) : (
          <>
            {copy.dragDropPrefix}
            <span className="yk-drop-browse">
              {allowMultiple ? copy.browseFiles : copy.browseFile}
            </span>
          </>
        )}
      </p>
      {resolvedSubtitle && (
        <p className="yk-drop-sub" id={subId}>
          {resolvedSubtitle}
        </p>
      )}
    </div>
  );

  const bodyContent = (
    <div className={cn("yk-upload", activeError && "invalid")}>
      {showLabelRow && (
        <div className="yk-label-row">
          {label ? (
            <span className="yk-label" id={labelId}>
              {label}
            </span>
          ) : (
            <span />
          )}
          {resolvedAcceptedLabel && (
            <span className="yk-label-hint">{resolvedAcceptedLabel}</span>
          )}
        </div>
      )}

      {maxFiles === 1 && singleFile ? (
        <div
          className={cn(
            "yk-drop has-file",
            isDragging && "dragover",
            disabled && "is-disabled",
            compact && "is-compact",
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {renderFileItem(singleFile, true)}
        </div>
      ) : (
        (!isAtLimit || maxFiles === 1) && (
          <button
            type="button"
            className={cn(
              "yk-drop",
              isDragging && "dragover",
              compact && "is-compact",
            )}
            disabled={disabled}
            aria-labelledby={label ? `${labelId} ${titleId}` : titleId}
            aria-describedby={describedByIds || undefined}
            aria-invalid={activeError ? true : undefined}
            onClick={() => !disabled && inputRef.current?.click()}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {dropEmptyContent}
          </button>
        )
      )}

      {maxFiles > 1 && files.length > 0 && (
        <div className="yk-file-list">
          {files.map((uf) => (
            <div key={uf.id} className="yk-file-card">
              {renderFileItem(uf, false)}
            </div>
          ))}
        </div>
      )}

      {maxFiles > 1 && files.length > 0 && (
        <div className="yk-upload-summary">
          <span>
            {copy.filesSummary(files.length, formatBytes(totalSize))}
          </span>
          {!hasUploading && (
            <button
              type="button"
              className="yk-upload-clear"
              disabled={disabled}
              onClick={clearAll}
            >
              {copy.clear}
            </button>
          )}
        </div>
      )}

      {activeError && (
        <p className="yk-upload-error" id={errorId} role="alert">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span>{activeError}</span>
        </p>
      )}
    </div>
  );

  const footerContent = renderFooter ? (
    <div className="flex items-center justify-between gap-3 w-full">
      {showEncryptionBadge ? (
        <div className="text-muted-foreground flex items-center gap-1.5">
          <FaShieldAlt className="size-3 text-primary/80" aria-hidden="true" />
          <span className="text-[11px] sm:text-xs">{copy.encryptedBadge}</span>
        </div>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={onCancel}
          >
            {resolvedCancelLabel}
          </Button>
        )}

        {onSubmit && (
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={disabled || !allDone}
            onClick={handleSubmit}
            className="gap-1.5"
          >
            {resolvedSubmitLabel}
            <FaArrowRight className="size-3" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  ) : null;

  const hiddenInput = (
    <input
      ref={inputRef}
      id={inputId}
      type="file"
      accept={accept}
      multiple={allowMultiple}
      disabled={disabled}
      className="visually-hidden"
      tabIndex={-1}
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
