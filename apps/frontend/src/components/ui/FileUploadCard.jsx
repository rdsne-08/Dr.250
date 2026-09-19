import { CheckCircle2, FileText, UploadCloud } from 'lucide-react';
import { useId, useRef, useState } from 'react';

import { cn } from '../../lib/classNames.js';
import { Button } from './Button.jsx';
import { Card } from './Card.jsx';

export function FileUploadCard({
  accept,
  buttonLabel = 'Choose file',
  className,
  description,
  disabled = false,
  dragActiveLabel = 'Drop the file here',
  file,
  id: providedId,
  inputName,
  onFileSelect,
  replaceButtonLabel = 'Replace file',
  selectedFileLabel = 'Selected file',
  title = 'Upload a file',
  ...props
}) {
  const generatedId = useId();
  const inputId = providedId ?? generatedId;
  const inputRef = useRef(null);
  const [internalFile, setInternalFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const isControlled = file !== undefined;
  const selectedFile = isControlled ? file : internalFile;

  function selectFile(nextFile, event) {
    if (!isControlled) {
      setInternalFile(nextFile);
    }

    onFileSelect?.(nextFile, event);
  }

  function handleInputChange(event) {
    selectFile(event.target.files?.[0] ?? null, event);
  }

  function handleDragOver(event) {
    event.preventDefault();

    if (!disabled) {
      event.dataTransfer.dropEffect = 'copy';
      setIsDragging(true);
    }
  }

  function handleDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragging(false);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);

    if (!disabled) {
      selectFile(event.dataTransfer.files?.[0] ?? null, event);
    }
  }

  return (
    <Card
      className={cn(
        'border-dashed p-5 transition duration-300 sm:p-6',
        isDragging
          ? 'border-medical-500 bg-medical-50 shadow-lift ring-4 ring-medical-100'
          : 'border-medical-200 bg-gradient-to-br from-white to-medical-50/50 hover:border-medical-300',
        disabled && 'cursor-not-allowed opacity-55',
        className,
      )}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-disabled={disabled || undefined}
      {...props}
    >
      <input
        ref={inputRef}
        id={inputId}
        name={inputName}
        className="sr-only"
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={handleInputChange}
      />

      <div className="flex flex-col items-center text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-white text-medical-700 shadow-card">
          {selectedFile ? (
            <FileText className="size-6" aria-hidden="true" />
          ) : (
            <UploadCloud className="size-6" aria-hidden="true" />
          )}
        </span>

        <h3 className="mt-4 text-base font-bold text-ink-900">
          {isDragging ? dragActiveLabel : title}
        </h3>

        {selectedFile ? (
          <div className="mt-3 flex max-w-full items-center gap-2 rounded-2xl border border-medical-100 bg-white px-3 py-2 shadow-card">
            <CheckCircle2 className="size-4 shrink-0 text-health-600" aria-hidden="true" />
            <span className="text-xs font-semibold text-ink-500">{selectedFileLabel}</span>
            <span className="max-w-48 truncate text-xs font-bold text-ink-800 sm:max-w-64">
              {selectedFile.name}
            </span>
          </div>
        ) : description ? (
          <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">{description}</p>
        ) : null}

        <Button
          className="mt-5"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <UploadCloud className="size-4" aria-hidden="true" />
          {selectedFile ? replaceButtonLabel : buttonLabel}
        </Button>
      </div>
    </Card>
  );
}
