import { FlaskConical, Send } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button, Card, Input, Notification } from '../../../components/ui/index.js';
import { doctorService } from '../../../services/doctorService.js';

export function LabOrderForm({ copy, laboratories, onOrdered, patient }) {
  const [laboratoryId, setLaboratoryId] = useState('');
  const [testName, setTestName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    setNotification(null);
    setTestName('');
  }, [patient?.id]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!patient) return;

    setIsSubmitting(true);
    setNotification(null);
    try {
      await doctorService.createLabRequest({ patientId: patient.id, laboratoryId, testName });
      setTestName('');
      setNotification('success');
      onOrdered?.();
    } catch (error) {
      setNotification(error?.message || copy.labOrder.errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card id="lab-order" className="mt-7 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-medical-50 text-medical-700">
          <FlaskConical className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-ink-950">{copy.labOrder.title}</h2>
          <p className="mt-1 text-sm leading-6 text-ink-500">{copy.labOrder.description}</p>
        </div>
      </div>

      {notification ? (
        <Notification
          className="mt-4"
          variant={notification === 'success' ? 'success' : 'error'}
          title={notification === 'success' ? copy.labOrder.successTitle : copy.labOrder.errorTitle}
          message={notification === 'success' ? copy.labOrder.successMessage : notification}
          onDismiss={() => setNotification(null)}
        />
      ) : null}

      <form className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end" onSubmit={handleSubmit}>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink-800" htmlFor="lab-order-laboratory">
            {copy.labOrder.laboratory}
          </label>
          <select
            id="lab-order-laboratory"
            required
            disabled={!patient || isSubmitting}
            value={laboratoryId}
            onChange={(event) => setLaboratoryId(event.target.value)}
            className="min-h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-base text-ink-900 outline-none transition focus:border-medical-500 focus:ring-4 focus:ring-medical-100 disabled:bg-ink-50"
          >
            <option value="">{copy.labOrder.chooseLaboratory}</option>
            {laboratories.map((laboratory) => (
              <option key={laboratory.id} value={laboratory.id}>{laboratory.name}</option>
            ))}
          </select>
        </div>
        <Input
          required
          disabled={!patient || isSubmitting}
          label={copy.labOrder.testName}
          placeholder={copy.labOrder.testPlaceholder}
          value={testName}
          onChange={(event) => setTestName(event.target.value)}
        />
        <Button disabled={!patient || laboratories.length === 0} loading={isSubmitting} type="submit">
          {!isSubmitting ? <Send className="size-4" aria-hidden="true" /> : null}
          {copy.labOrder.submit}
        </Button>
      </form>
      <p className="mt-3 text-xs text-ink-500">
        {patient
          ? copy.labOrder.patient.replace('{patient}', patient.name)
          : copy.labOrder.selectPatient}
      </p>
    </Card>
  );
}
