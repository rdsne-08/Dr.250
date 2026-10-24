import { useEffect, useRef, useState } from 'react';
import { KeyRound } from 'lucide-react';

import { Button, Card } from '../../../components/ui/index.js';
import { doctorService } from '../../../services/doctorService.js';
import { getApiErrorMessage } from '../../../services/apiErrorMessages.js';

const labels = {
  en: {
    title: 'Redeem patient access', instruction: 'Enter the temporary PIN shared by the patient. The patient must select your verified profile first.',
    pin: 'Temporary PIN', redeem: 'Redeem access', success: 'Access activated. Your patient list has been refreshed.',
    scan: 'Scan QR', stop: 'Stop camera', cameraError: 'Camera or QR scanning is unavailable. Enter the PIN instead.',
  },
  bn: {
    title: 'রোগীর অ্যাক্সেস চালু করুন', instruction: 'রোগীর দেওয়া অস্থায়ী পিন লিখুন। রোগীকে আগে আপনার যাচাইকৃত প্রোফাইল নির্বাচন করতে হবে।',
    pin: 'অস্থায়ী পিন', redeem: 'অ্যাক্সেস চালু করুন', success: 'অ্যাক্সেস চালু হয়েছে। রোগীর তালিকা হালনাগাদ হয়েছে।',
    scan: 'QR স্ক্যান করুন', stop: 'ক্যামেরা বন্ধ করুন', cameraError: 'ক্যামেরা বা QR স্ক্যান উপলব্ধ নয়। পিন লিখুন।',
  },
};

export function AccessRedemptionCard({ language = 'en', onRedeemed }) {
  const text = labels[language] ?? labels.en;
  const [credential, setCredential] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const cameraRef = useRef(null);
  const timerRef = useRef(null);

  function stopScan() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    cameraRef.current?.getTracks().forEach((track) => track.stop());
    timerRef.current = null;
    cameraRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    cameraRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function startScan() {
    if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) {
      setError(text.cameraError); return;
    }
    setError('');
    try {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      cameraRef.current = stream;
      setScanning(true);
      // The video element mounts after the state update.
      window.setTimeout(async () => {
        if (!cameraRef.current || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        try { await videoRef.current.play(); }
        catch { stopScan(); setError(text.cameraError); return; }
        timerRef.current = window.setInterval(async () => {
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes.find((code) => /^[A-Za-z0-9_-]{32}$/.test(code.rawValue))?.rawValue;
            if (value) { setCredential(value); stopScan(); }
          } catch { stopScan(); setError(text.cameraError); }
        }, 250);
      }, 0);
    } catch { stopScan(); setError(text.cameraError); }
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      await doctorService.redeemAccess(credential.trim());
      setCredential('');
      setMessage(text.success);
      await onRedeemed?.();
    } catch (failure) {
      setError(getApiErrorMessage(failure, language));
    } finally { setBusy(false); }
  }

  return (
    <Card className="mt-7 p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <KeyRound className="size-6 text-health-700" aria-hidden="true" />
        <h2 className="text-xl font-bold text-ink-950">{text.title}</h2>
      </div>
      <p className="mt-2 text-sm text-ink-600">{text.instruction}</p>
      <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={submit}>
        <label className="flex-1 text-sm font-semibold text-ink-800">
          {text.pin}
          <input className="mt-2 w-full rounded-xl border border-ink-200 bg-white p-3 font-mono"
            autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={32}
            value={credential} onChange={(event) => setCredential(event.target.value)} />
        </label>
        <Button type="submit" disabled={busy || !credential.trim()}>{text.redeem}</Button>
      </form>
      <div className="mt-3">
        <Button type="button" size="sm" variant="outline" onClick={scanning ? stopScan : startScan}>
          {scanning ? text.stop : text.scan}
        </Button>
        {scanning && <video ref={videoRef} className="mt-3 max-h-64 w-full rounded-xl bg-black" muted playsInline aria-label={text.scan} />}
      </div>
      {message && <p className="mt-3 text-sm text-health-700" role="status">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
    </Card>
  );
}
