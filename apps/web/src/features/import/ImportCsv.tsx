import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCsvImport } from '../../hooks/use-csv-import';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import type { ImportApiResponse } from '@org/shared-types';

export function ImportCsv() {
  const { piId = '' } = useParams<{ piId: string }>();
  const navigate = useNavigate();
  const importCsv = useCsvImport(piId);

  const [isDragOver, setIsDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Counter-based drag tracking: avoids the child-element onDragLeave false-fire problem.
  // Every dragenter increments, every dragleave decrements — only 0 means "truly left".
  const dragCounter = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (f: File) => {
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setError('Only .csv files are supported.');
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
    try {
      const res = await importCsv.mutateAsync(f);
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    }
  }, [importCsv]);

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) processFile(dropped);
  }, [processFile]);

  // ── Also prevent browser from navigating when a file is dropped outside the zone ──
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  const isPending = importCsv.isPending;

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Import CSV</h1>
          <p className="text-sm text-on-surface-muted mt-1">
            Drag a file from your desktop and drop it anywhere in the box below.
          </p>
        </div>
        {result && (
          <Button variant="secondary" onClick={() => navigate(`/pi/${piId}`)}>
            Go to board →
          </Button>
        )}
      </div>

      {/* Expected format */}
      <div className="bg-surface-raised border border-border rounded-lg px-4 py-3 mb-6 text-xs text-on-surface-subtle font-mono leading-relaxed">
        <span className="font-semibold text-on-surface not-italic font-sans text-xs">Expected columns:</span><br />
        feature_id, feature_name, feature_priority, story_id, story_title,<br />
        estimation, depends_on, external_dependency_sprint
      </div>

      {/* Drop zone */}
      <div
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={() => !isPending && inputRef.current?.click()}
        className={[
          'relative flex flex-col items-center justify-center',
          'rounded-2xl border-2 border-dashed transition-all duration-150 cursor-pointer',
          'min-h-[240px] select-none',
          isDragOver
            ? 'border-indigo-500 bg-indigo-50 scale-[1.01]'
            : 'border-border bg-surface hover:border-accent hover:bg-surface-raised',
          isPending ? 'pointer-events-none opacity-70' : '',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }}
        />

        {isPending ? (
          <>
            <div className="w-10 h-10 mb-4 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" />
            <p className="text-indigo-600 font-medium">Importing {file?.name}…</p>
          </>
        ) : isDragOver ? (
          <>
            <div className="text-5xl mb-3">📂</div>
            <p className="text-indigo-600 font-semibold text-lg">Drop to import</p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-3">📄</div>
            <p className="text-on-surface-muted font-medium text-lg">
              {file && result ? file.name : 'Drop your CSV here'}
            </p>
            <p className="text-on-surface-subtle text-sm mt-1">or click to browse</p>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 dark:bg-danger dark:border-danger-fg/30 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Result */}
      {result && !isPending && (
        <Card className="mt-6 p-4">
          <div className="flex items-center gap-6 mb-3">
            <span className="flex items-center gap-1.5 text-success-fg font-semibold">
              <span className="text-lg">✓</span> {result.imported} imported
            </span>
            {result.skipped > 0 && (
              <span className="text-on-surface-muted text-sm">{result.skipped} skipped</span>
            )}
            {result.errors.length > 0 && (
              <span className="text-danger-fg text-sm font-medium">{result.errors.length} row errors</span>
            )}
          </div>

          {result.errors.length > 0 && (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {result.errors.map((e, i) => (
                <div key={i} className="text-xs text-danger-fg bg-red-50 rounded px-2 py-1">
                  Row {e.row} · <span className="font-medium">{e.field}</span>: {e.message}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-3 border-t flex gap-3">
            <Button onClick={() => navigate(`/pi/${piId}`)}>
              View board
            </Button>
            <Button variant="secondary" onClick={() => { setResult(null); setFile(null); }}>
              Import another file
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
