import React, { useMemo, useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  X,
  Play,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FolderUp,
  Files,
  Trash2,
  Lock,
} from 'lucide-react';
import type { JobDescription, QueuedResumeFile } from '../types/ats';

interface UploadJdModuleProps {
  jobDescription: JobDescription;
  queuedFiles: QueuedResumeFile[];
  onAddFiles: (files: QueuedResumeFile[]) => void;
  onRemoveFile: (id: string) => void;
  onClearFiles: () => void;
  onRunScreening: () => Promise<void>;
  isScreening: boolean;
  screeningStageIndex: number;
  screeningStatusMessage?: string | null;
  bulkProgress: { processed: number; total: number; recentNames: string[] };
  screeningError: string | null;
  candidateCount: number;
  autoShortlistOnUpload: boolean;
  onToggleAutoShortlist: (val: boolean) => void;
}

const SCREENING_STAGES = [
  'Parsing bulk resume batch...',
  'Evaluating semantic fit against JD...',
  'Detecting duplicates & building rank list...',
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function buildValidPdfFile(fileName: string, lines: string[]): File {
  const textOps = lines
    .map((line, idx) => {
      const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      return idx === 0
        ? `BT /F1 12 Tf 48 750 Td (${escaped}) Tj ET`
        : `BT /F1 10 Tf 48 ${750 - idx * 20} Td (${escaped}) Tj ET`;
    })
    .join('\n');

  const streamContent = `${textOps}\n`;
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}endstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new File([pdf], fileName, { type: 'application/pdf' });
}

function createSampleBulkResumes(): File[] {
  return [
    buildValidPdfFile('Kabir_Malhotra_Resume.pdf', [
      'KABIR MALHOTRA',
      'Bengaluru, India | kabir.malhotra@nitt.edu | +91 98451 67204',
      'Education: B.Tech Computer Science, NIT Tiruchirappalli (2022) - CGPA: 9.04 / 10',
      'Class 12: 94.2% | Class 10: 95.8% | Experience: 3.4 Years',
      'Current Role: Software Engineer II at Swiggy',
      'Skills: TypeScript, React, Node.js, PostgreSQL, Redis, Docker, Tailwind CSS, REST APIs, System Design, AWS',
    ]),
    buildValidPdfFile('Neha_Kulkarni_CV.pdf', [
      'NEHA KULKARNI',
      'Pune, India | neha.kulkarni@pict.edu | +91 97642 33190',
      'Education: B.E. Information Technology, PICT Pune (2021) - CGPA: 8.91 / 10',
      'Class 12: 91.5% | Class 10: 93.4% | Experience: 4.1 Years',
      'Current Role: Senior Product Engineer at Cred',
      'Skills: TypeScript, React, Next.js, Node.js, PostgreSQL, GraphQL, Tailwind CSS, Docker, AWS',
    ]),
    buildValidPdfFile('Arjun_Menon_FullStack.pdf', [
      'ARJUN MENON',
      'Hyderabad, India | arjun.menon.dev@gmail.com | +91 98850 14289',
      'Education: B.Tech CSE, IIIT Bangalore (2023) - CGPA: 8.65 / 10',
      'Class 12: 90.8% | Class 10: 92.0% | Experience: 2.3 Years',
      'Current Role: Full-Stack Developer at Zeta',
      'Skills: React, TypeScript, Node.js, PostgreSQL, REST APIs, Redis, Docker',
    ]),
    buildValidPdfFile('Ishita_Banerjee_SDE.pdf', [
      'ISHITA BANERJEE',
      'Bengaluru, India | ishita.banerjee@jadavpur.ac.in | +91 98301 55210',
      'Education: B.E. Computer Science, Jadavpur University (2022) - CGPA: 8.80 / 10',
      'Class 12: 93.6% | Class 10: 94.1% | Experience: 3.0 Years',
      'Current Role: Software Engineer at Atlassian',
      'Skills: TypeScript, React, Node.js, PostgreSQL, Tailwind CSS, System Design, AWS, GraphQL',
    ]),
    buildValidPdfFile('Raghavendra_Rao_Backend.pdf', [
      'RAGHAVENDRA RAO',
      'Chennai, India | raghav.rao@ssn.edu.in | +91 94452 88901',
      'Education: B.Tech IT, SSN College of Engineering (2023) - CGPA: 8.12 / 10',
      'Class 12: 87.4% | Class 10: 89.2% | Experience: 2.0 Years',
      'Current Role: Backend Engineer at Freshworks',
      'Skills: Node.js, JavaScript, MySQL, Redis, Docker, REST APIs',
    ]),
  ];
}

function readEntryFiles(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise((resolve) => {
      (entry as FileSystemFileEntry).file(
        (file) => resolve([file]),
        () => resolve([])
      );
    });
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    return new Promise((resolve) => {
      const allEntries: FileSystemEntry[] = [];
      const readNextBatch = () => {
        reader.readEntries(
          async (entries) => {
            if (!entries.length) {
              const nested = await Promise.all(allEntries.map(readEntryFiles));
              resolve(nested.flat());
              return;
            }
            allEntries.push(...entries);
            readNextBatch();
          },
          () => resolve([])
        );
      };
      readNextBatch();
    });
  }
  return Promise.resolve([]);
}

async function extractDroppedFiles(dataTransfer: DataTransfer): Promise<File[]> {
  const items = dataTransfer.items;
  if (items && items.length > 0) {
    const entries = Array.from(items)
      .map((item) =>
        typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null
      )
      .filter((entry): entry is FileSystemEntry => entry !== null);

    if (entries.some((entry) => entry.isDirectory)) {
      const nested = await Promise.all(entries.map(readEntryFiles));
      return nested.flat();
    }
  }
  return Array.from(dataTransfer.files ?? []);
}

export const UploadJdModule: React.FC<UploadJdModuleProps> = ({
  jobDescription,
  queuedFiles,
  onAddFiles,
  onRemoveFile,
  onClearFiles,
  onRunScreening,
  isScreening,
  screeningStageIndex,
  screeningStatusMessage,
  bulkProgress,
  screeningError,
  candidateCount,
  autoShortlistOnUpload,
  onToggleAutoShortlist,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropWarning, setDropWarning] = useState<string | null>(null);

  const queueStats = useMemo(() => {
    const totalBytes = queuedFiles.reduce((acc, f) => acc + f.size, 0);
    const pdfCount = queuedFiles.filter((f) => f.extension === 'pdf').length;
    const docxCount = queuedFiles.filter((f) => f.extension === 'docx').length;
    return { totalBytes, pdfCount, docxCount };
  }, [queuedFiles]);

  const handleIncomingFiles = (fileList: FileList | File[]) => {
    setDropWarning(null);
    const valid: QueuedResumeFile[] = [];
    const rejectedNames: string[] = [];
    const existingKeys = new Set(queuedFiles.map((f) => `${f.name}::${f.size}`));
    let duplicateSkippedCount = 0;

    Array.from(fileList).forEach((file) => {
      const lower = file.name.toLowerCase();
      if (lower.startsWith('~$') || lower.startsWith('.')) return;
      const key = `${file.name}::${file.size}`;
      if (existingKeys.has(key)) {
        duplicateSkippedCount += 1;
        return;
      }

      if (lower.endsWith('.pdf')) {
        existingKeys.add(key);
        valid.push({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          file,
          name: file.name,
          size: file.size,
          extension: 'pdf',
          status: 'queued',
        });
      } else if (lower.endsWith('.docx')) {
        existingKeys.add(key);
        valid.push({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          file,
          name: file.name,
          size: file.size,
          extension: 'docx',
          status: 'queued',
        });
      } else {
        rejectedNames.push(file.name);
      }
    });

    if (rejectedNames.length > 0) {
      setDropWarning(
        `Skipped ${rejectedNames.length} unsupported file(s): ${rejectedNames.slice(0, 4).join(', ')}${
          rejectedNames.length > 4 ? '...' : ''
        }. Only .pdf and .docx resumes are supported.`
      );
    } else if (duplicateSkippedCount > 0 && valid.length === 0) {
      setDropWarning(
        `${duplicateSkippedCount} selected file${duplicateSkippedCount === 1 ? ' is' : 's are'} already in the upload queue.`
      );
    }

    if (valid.length > 0) {
      onAddFiles(valid);
    }
  };

  const progressPct =
    bulkProgress.total > 0
      ? Math.round((bulkProgress.processed / bulkProgress.total) * 100)
      : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Action Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E2E4EC] rounded-xl p-5">
        <div>
          <h2 className="font-display text-lg font-bold text-[#111936]">
            Upload Resumes &amp; Job Description Matching
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Select or drop multiple .pdf / .docx resumes together (or an entire folder) to parse candidate names, detect duplicates, and generate a ranked shortlist.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 shrink-0">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#111936] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoShortlistOnUpload}
              onChange={(e) => onToggleAutoShortlist(e.target.checked)}
              className="w-4 h-4 rounded border-[#C2C7D6] text-[#1D4ED8] focus:ring-[#1D4ED8] cursor-pointer"
            />
            Auto-Shortlist (Score ≥ 80)
          </label>

          <button
            type="button"
            onClick={onRunScreening}
            disabled={isScreening}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] focus-visible:ring-offset-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isScreening ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Screening Batch...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                {queuedFiles.length > 0
                  ? `Run AI Screening (${queuedFiles.length} Resumes)`
                  : 'Re-Score Existing Pool'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Multi-stage Bulk Screening Progress Banner */}
      {isScreening && (
        <div
          className="bg-white border border-[#1D4ED8] rounded-xl p-5 space-y-4"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-sm font-bold text-[#111936]">
              Bulk AI Screening Pipeline Active
            </span>
            {bulkProgress.total > 0 ? (
              <span className="text-xs tabular-nums font-bold text-[#1D4ED8]">
                Processed {bulkProgress.processed} of {bulkProgress.total} resumes ({progressPct}%)
              </span>
            ) : (
              <span className="text-xs tabular-nums text-[#1D4ED8] font-semibold">
                Re-evaluating {candidateCount} candidates...
              </span>
            )}
          </div>

          {bulkProgress.total > 0 && (
            <div className="w-full h-2 bg-[#FAF9F6] border border-[#E2E4EC] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1D4ED8] transition-all duration-300"
                style={{ width: `${Math.max(8, progressPct)}%` }}
              />
            </div>
          )}

          {screeningStatusMessage && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FEF3C7] border border-[#FCD34D] text-xs font-semibold text-[#B45309]">
              <Loader2 className="w-3.5 h-3.5 text-[#B45309] animate-spin shrink-0" />
              <span>{screeningStatusMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SCREENING_STAGES.map((stageLabel, index) => {
              const isDone = index < screeningStageIndex;
              const isCurrent = index === screeningStageIndex;
              return (
                <div
                  key={stageLabel}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm transition-colors ${
                    isCurrent
                      ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF] font-semibold'
                      : isDone
                        ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857] font-medium'
                        : 'bg-[#FAF9F6] border-[#E2E4EC] text-slate-400'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-[#1D4ED8] animate-spin shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-[#C2C7D6] shrink-0" />
                  )}
                  <span className="truncate">{stageLabel}</span>
                </div>
              );
            })}
          </div>

          {bulkProgress.recentNames.length > 0 && (
            <div className="text-xs text-slate-600 flex flex-wrap items-center gap-1.5 pt-1">
              <span className="font-semibold text-[#111936]">Extracted names:</span>
              {bulkProgress.recentNames.map((name) => (
                <span
                  key={name}
                  className="px-2 py-0.5 rounded bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] font-semibold"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Screening API Error Banner */}
      {screeningError && (
        <div
          className="flex items-start gap-3 bg-[#FFF1F2] border border-[#FECDD3] rounded-xl p-4 text-sm text-[#BE123C]"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 text-[#BE123C] mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">Screening could not complete</p>
            <p className="mt-0.5">{screeningError}</p>
          </div>
        </div>
      )}

      {/* Two-column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Bulk Multi-file Resume Dropzone */}
        <section className="lg:col-span-5 bg-white border border-[#E2E4EC] rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-base font-bold text-[#111936]">
                Upload Resumes Queue
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select multiple files at once or add batches from different folders
              </p>
            </div>
            <span className="text-xs tabular-nums font-bold text-[#1D4ED8]">
              {queuedFiles.length} file{queuedFiles.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              if (isScreening) return;
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setIsDragging(false);
              if (isScreening) return;
              const files = await extractDroppedFiles(e.dataTransfer);
              if (files.length) {
                handleIncomingFiles(files);
              }
            }}
            onClick={() => {
              if (!isScreening) fileInputRef.current?.click();
            }}
            role="button"
            tabIndex={isScreening ? -1 : 0}
            aria-disabled={isScreening}
            onKeyDown={(e) => {
              if (isScreening) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`border-2 border-dashed rounded-xl p-7 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] ${
              isScreening
                ? 'border-[#E2E4EC] bg-[#FAF9F6] opacity-60 cursor-not-allowed'
                : isDragging
                  ? 'border-[#1D4ED8] bg-[#EFF6FF] cursor-pointer'
                  : 'border-[#C2C7D6] bg-[#FAF9F6] hover:border-[#1D4ED8] hover:bg-white cursor-pointer'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple={true}
              disabled={isScreening}
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  handleIncomingFiles(e.target.files);
                  e.target.value = '';
                }
              }}
            />
            <input
              ref={folderInputRef}
              type="file"
              multiple={true}
              disabled={isScreening}
              {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  handleIncomingFiles(e.target.files);
                  e.target.value = '';
                }
              }}
            />
            <div className="w-11 h-11 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] flex items-center justify-center mx-auto mb-3">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-[#111936]">
              {isScreening
                ? 'Parsing queue locked while AI screening runs'
                : 'Drag & drop multiple resumes or a folder here'}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Click to select multiple .pdf / .docx files together (hold Ctrl / Cmd or Shift)
            </p>
          </div>

          {/* Multi-file Browse & Sample Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isScreening}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E2E4EC] bg-white hover:border-[#B8BDCE] hover:bg-[#FAF9F6] disabled:opacity-50 disabled:cursor-not-allowed text-[#111936] cursor-pointer"
              >
                <Files className="w-3.5 h-3.5 text-[#1D4ED8]" />
                {queuedFiles.length > 0 ? 'Add More Files' : 'Select Multiple Files'}
              </button>
              <button
                type="button"
                disabled={isScreening}
                onClick={() => folderInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E2E4EC] bg-white hover:border-[#B8BDCE] hover:bg-[#FAF9F6] disabled:opacity-50 disabled:cursor-not-allowed text-[#111936] cursor-pointer"
              >
                <FolderUp className="w-3.5 h-3.5 text-slate-500" />
                Select Folder
              </button>
            </div>

            <button
              type="button"
              disabled={isScreening}
              onClick={() => handleIncomingFiles(createSampleBulkResumes())}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] hover:text-[#1E40AF] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Load 5 sample resumes
            </button>
          </div>

          {dropWarning && (
            <div className="flex items-start gap-2 text-xs text-[#B45309] bg-[#FEF3C7] border border-[#FCD34D] rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
              <span>{dropWarning}</span>
            </div>
          )}

          {/* Batch Summary & File List */}
          {queuedFiles.length > 0 ? (
            <div className="space-y-3 pt-3 border-t border-[#E2E4EC]">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="text-slate-600 tabular-nums">
                  <strong className="text-[#111936]">{queuedFiles.length}</strong> total ·{' '}
                  {queueStats.pdfCount} PDF · {queueStats.docxCount} DOCX ·{' '}
                  {formatBytes(queueStats.totalBytes)}
                </div>
                <button
                  type="button"
                  onClick={onClearFiles}
                  disabled={isScreening}
                  className="inline-flex items-center gap-1 text-[#BE123C] hover:text-[#9F1239] disabled:opacity-40 font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear All
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                {queuedFiles.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#FAF9F6] border border-[#E2E4EC] text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" />
                      <span className="font-semibold text-[#111936] truncate">{item.name}</span>
                      <span className="text-slate-500 tabular-nums shrink-0">
                        {formatBytes(item.size)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === 'processing' && (
                        <span className="inline-flex items-center gap-1 text-[#1D4ED8] font-semibold">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Parsing
                        </span>
                      )}
                      {item.status === 'done' && (
                        <span className="inline-flex items-center gap-1 text-[#047857] font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          Screened
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span
                          title={item.errorMessage}
                          className="text-[#BE123C] font-semibold"
                        >
                          Error
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={isScreening}
                        onClick={() => onRemoveFile(item.id)}
                        className="p-0.5 rounded hover:bg-[#E2E4EC] text-slate-500 hover:text-[#111936] disabled:opacity-40 cursor-pointer"
                        aria-label={`Remove ${item.name}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-3 border-t border-[#E2E4EC] text-xs text-slate-500">
              No new resumes queued. Drop a batch above or click &ldquo;Load 5 sample resumes&rdquo; to test bulk parsing and rank-list generation.
            </div>
          )}
        </section>

        {/* Right: Non-Editable Active Job Description Baseline */}
        <section
          className="lg:col-span-7 bg-white border border-[#E2E4EC] rounded-xl p-6 space-y-5"
          aria-label="Active Job Description Screening Baseline (Read-Only)"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-bold text-[#111936]">
                Active Job Description Baseline
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Resumes are parsed and scored strictly against these pre-configured role criteria.
              </p>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border shrink-0 ${
                isScreening
                  ? 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]'
                  : 'bg-[#FAF9F6] text-[#111936] border-[#E2E4EC]'
              }`}
            >
              <Lock className="w-3 h-3" />
              {isScreening ? 'Locked · AI Screening Active' : 'Read-Only Baseline'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-[#FAF9F6] border border-[#E2E4EC]">
              <div className="text-[11px] font-semibold text-slate-500">
                Role Title
              </div>
              <div className="text-sm font-bold text-[#111936] mt-0.5">
                {jobDescription.title}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#FAF9F6] border border-[#E2E4EC]">
              <div className="text-[11px] font-semibold text-slate-500">
                Department
              </div>
              <div className="text-sm font-semibold text-[#111936] mt-0.5">
                {jobDescription.department}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#FAF9F6] border border-[#E2E4EC]">
              <div className="text-[11px] font-semibold text-slate-500">
                Location (Google Verified)
              </div>
              <div className="text-sm font-semibold text-[#111936] mt-0.5">
                {jobDescription.location}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#FAF9F6] border border-[#E2E4EC]">
              <div className="text-[11px] font-semibold text-slate-500">
                Job Type
              </div>
              <div className="mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#EFF6FF] border border-[#BFDBFE] text-xs font-semibold text-[#1E40AF]">
                  {jobDescription.jobType || 'Hybrid'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#FAF9F6] border border-[#E2E4EC]">
              <div className="text-[11px] font-semibold text-slate-500">
                Experience
              </div>
              <div className="text-sm font-semibold text-[#111936] mt-0.5 tabular-nums">
                {jobDescription.experienceRange}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#FAF9F6] border border-[#E2E4EC]">
              <div className="text-[11px] font-semibold text-slate-500">
                Min CGPA
              </div>
              <div className="text-sm tabular-nums font-bold text-[#111936] mt-0.5">
                {jobDescription.minCgpa.toFixed(1)}
              </div>
            </div>
          </div>

          {/* Required Skills (Read-Only) */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#111936]">
              Required Skills ({jobDescription.requiredSkills.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {jobDescription.requiredSkills.length > 0 ? (
                jobDescription.requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#EFF6FF] border border-[#BFDBFE] text-xs font-semibold text-[#1E40AF]"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">No required skills specified.</span>
              )}
            </div>
          </div>

          {/* Preferred Skills (Read-Only) */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#111936]">
              Preferred Skills ({jobDescription.preferredSkills.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {jobDescription.preferredSkills.length > 0 ? (
                jobDescription.preferredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#FEFCE8] border border-[#FDE047] text-xs font-semibold text-[#854D0E]"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">No preferred skills specified.</span>
              )}
            </div>
          </div>

          {/* Full JD Text (Read-Only) */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-[#111936]">
              Job Description &amp; Responsibilities
            </div>
            <div className="w-full px-4 py-3 text-sm leading-relaxed bg-[#FAF9F6] border border-[#E2E4EC] rounded-lg text-[#111936] whitespace-pre-line">
              {jobDescription.description}
            </div>
          </div>

          <p className="text-xs text-slate-500 pt-1 border-t border-[#E2E4EC]">
            {isScreening
              ? 'Screening in progress — role criteria are locked while resumes are parsed and evaluated.'
              : 'Need to update requirements or use Sentinel AI skill intelligence? Update this role from Job Descriptions or Role Overview before uploading resumes.'}
          </p>
        </section>
      </div>
    </div>
  );
};
