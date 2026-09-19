import { CheckCircle2, FileText, Send, ShieldCheck, UploadCloud } from 'lucide-react';
import { useId, useRef, useState } from 'react';

import { Button, Card, Input, Notification } from '../../../components/ui/index.js';
import { labService } from '../../../services/labService.js';

export function ReportUpload({ copy, onUploaded }) {
  const fileInputId = useId();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [patientId, setPatientId] = useState('');
  const [testType, setTestType] = useState('');
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  function updateFile(nextFile) {
    setFile(nextFile);
    setNotification(null);
  }

  async function handleSubmit() {
    setNotification(null);

    if (!confirmed) {
      setNotification('error');
      return;
    }

    setIsSubmitting(true);

    try {
      await labService.uploadReport({ file, patientId, testType, note });
      setFile(null);
      setPatientId('');
      setTestType('');
      setNote('');
      setConfirmed(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setNotification('success');
      onUploaded?.();
    } catch {
      setNotification('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="report-upload" className="scroll-mt-24" aria-labelledby="report-upload-title">
      <Card className="overflow-hidden border-medical-100 p-5 sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-medical-700">
            {copy.upload.eyebrow}
          </p>
          <h2 id="report-upload-title" className="mt-2 text-2xl font-bold tracking-[-0.035em] text-ink-950">
            {copy.upload.title}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink-500">{copy.upload.description}</p>
        </div>

        {notification ? (
          <Notification
            className="mt-5"
            variant={notification}
            title={notification === 'success' ? copy.upload.successTitle : copy.upload.errorTitle}
            message={notification === 'success' ? copy.upload.successMessage : copy.upload.errorMessage}
            dismissLabel={copy.upload.dismiss}
            onDismiss={() => setNotification(null)}
          />
        ) : null}

        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(16rem,0.8fr)_minmax(20rem,1.2fr)]">
          <div>
            <label
              htmlFor={fileInputId}
              className="group flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-medical-300 bg-medical-50/60 px-5 text-center transition hover:border-medical-500 hover:bg-medical-50 focus-within:ring-4 focus-within:ring-medical-100"
            >
              <span className="grid size-14 place-items-center rounded-2xl bg-white text-medical-700 shadow-card transition group-hover:-translate-y-1">
                {file ? <FileText className="size-6" aria-hidden="true" /> : <UploadCloud className="size-6" aria-hidden="true" />}
              </span>
              <span className="mt-4 text-sm font-bold text-ink-900">
                {file ? copy.upload.selectedFile : copy.upload.fileTitle}
              </span>
              {file ? (
                <span className="mt-2 max-w-full truncate text-xs font-semibold text-medical-700">{file.name}</span>
              ) : (
                <span className="mt-2 text-xs leading-5 text-ink-500">{copy.upload.fileHint}</span>
              )}
              <span className="mt-4 rounded-full border border-medical-200 bg-white px-4 py-2 text-xs font-bold text-medical-800 shadow-card">
                {file ? copy.upload.replaceFile : copy.upload.chooseFile}
              </span>
              <input
                ref={fileInputRef}
                id={fileInputId}
                className="sr-only"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(event) => updateFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
              <FileText className="size-4 text-medical-600" aria-hidden="true" />
              {copy.upload.reportDetails}
            </h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input
                label={copy.upload.patientLabel}
                placeholder={copy.upload.patientPlaceholder}
                value={patientId}
                onChange={(event) => {
                  setPatientId(event.target.value);
                  setNotification(null);
                }}
              />
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-800" htmlFor="lab-test-type">
                  {copy.upload.testLabel}
                </label>
                <select
                  id="lab-test-type"
                  value={testType}
                  onChange={(event) => {
                    setTestType(event.target.value);
                    setNotification(null);
                  }}
                  className="min-h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-base text-ink-900 outline-none transition focus:border-medical-500 focus:ring-4 focus:ring-medical-100"
                >
                  <option value="" disabled>{copy.upload.testPlaceholder}</option>
                  {copy.upload.testOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold text-ink-800" htmlFor="lab-report-note">
                {copy.upload.notesLabel}
              </label>
              <textarea
                id="lab-report-note"
                className="min-h-28 w-full resize-y rounded-2xl border border-ink-100 bg-white px-4 py-3 text-sm leading-6 text-ink-900 outline-none transition placeholder:text-ink-300 focus:border-medical-500 focus:ring-4 focus:ring-medical-100"
                placeholder={copy.upload.notesPlaceholder}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-canvas p-3.5 text-xs font-semibold leading-5 text-ink-600">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 accent-health-600"
                checked={confirmed}
                onChange={(event) => {
                  setConfirmed(event.target.checked);
                  setNotification(null);
                }}
              />
              <span>{copy.upload.consent}</span>
            </label>

            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex max-w-xs items-start gap-2 text-[0.68rem] leading-5 text-ink-500">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-health-600" aria-hidden="true" />
                {copy.upload.frontendNote}
              </p>
              <Button className="shrink-0" size="sm" loading={isSubmitting} onClick={handleSubmit}>
                {!isSubmitting && file ? <CheckCircle2 className="size-4" aria-hidden="true" /> : null}
                {!isSubmitting && !file ? <Send className="size-4" aria-hidden="true" /> : null}
                {copy.upload.submit}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
