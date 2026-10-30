import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, CheckCircle2, ImageUp, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Form';

const READER_ID = 'qr-reader';

/**
 * Camera QR scanner with camera selection, permission handling and an image-upload fallback.
 * Calls onDetected(text) once per successful scan.
 */
export function QrScanner({ onDetected }) {
  const scanner = useRef(null);
  const handled = useRef(false);
  const fileInput = useRef(null);
  const [state, setState] = useState('idle'); // idle | starting | scanning | denied | unavailable | detected
  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState('');
  const [message, setMessage] = useState('');

  const stop = async () => {
    try {
      if (scanner.current?.isScanning) await scanner.current.stop();
    } catch { /* already stopped */ }
  };

  const detected = async (text) => {
    if (handled.current) return;
    handled.current = true;
    setState('detected');
    await stop();
    setTimeout(() => onDetected(text), 450);
  };

  const start = async (id = cameraId) => {
    handled.current = false;
    setState('starting');
    setMessage('');
    try {
      if (!scanner.current) scanner.current = new Html5Qrcode(READER_ID, { verbose: false });
      let list = cameras;
      if (!list.length) {
        list = await Html5Qrcode.getCameras();
        setCameras(list);
      }
      if (!list.length) {
        setState('unavailable');
        setMessage('No camera was found on this device.');
        return;
      }
      const back = list.find((c) => /back|rear|environment/i.test(c.label));
      const chosen = id || back?.id || list[0].id;
      setCameraId(chosen);
      await stop();
      await scanner.current.start(chosen, { fps: 12, qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.68); return { width: s, height: s }; } }, detected, () => {});
      setState('scanning');
    } catch (err) {
      const text = String(err?.message || err);
      if (/permission|notallowed|denied/i.test(text)) {
        setState('denied');
        setMessage('Camera permission was denied. Allow camera access in your browser settings, or enter the Emergency ID manually.');
      } else {
        setState('unavailable');
        setMessage('The camera could not be started. It may be in use by another application.');
      }
    }
  };

  const scanFile = async (file) => {
    if (!file) return;
    setMessage('');
    try {
      await stop();
      if (!scanner.current) scanner.current = new Html5Qrcode(READER_ID, { verbose: false });
      const text = await scanner.current.scanFile(file, false);
      detected(text);
    } catch {
      setMessage('No QR code could be read from that image. Try a clearer image or manual entry.');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  useEffect(() => () => { stop(); }, []);

  const active = state === 'scanning' || state === 'starting';

  return (
    <div className="space-y-4">
      <div className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-2xl bg-navy-900">
        <div id={READER_ID} className="absolute inset-0" />
        {/* Viewfinder overlay */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-[16%] [--scan-distance:calc(min(420px,100vw)*0.66)]">
            {['left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-xl', 'right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-xl', 'left-0 bottom-0 border-l-[3px] border-b-[3px] rounded-bl-xl', 'right-0 bottom-0 border-r-[3px] border-b-[3px] rounded-br-xl'].map((c) => (
              <span key={c} className={`absolute size-9 ${state === 'detected' ? 'border-emerald-400' : 'border-brand-300'} transition-colors ${c}`} />
            ))}
            {state === 'scanning' && <span className="absolute inset-x-3 top-0 h-0.5 animate-scan rounded-full bg-brand-300 shadow-[0_0_16px_4px_rgb(52_163_176/0.6)]" />}
          </div>
        </div>
        <AnimatePresence>
          {!active && state !== 'detected' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-white/[0.06] text-brand-300 ring-1 ring-white/10">
                {state === 'denied' || state === 'unavailable' ? <CameraOff className="size-6" /> : <Camera className="size-6" />}
              </span>
              <p className="max-w-xs text-[13px] leading-5 text-white/70">{message || 'Point the camera at the patient’s Emergi-Access QR card. The code contains only an opaque Emergency ID.'}</p>
              <Button onClick={() => start()} icon={state === 'idle' ? Camera : RefreshCw}>{state === 'idle' ? 'Start camera' : 'Try again'}</Button>
            </motion.div>
          )}
          {state === 'detected' && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-navy-900/85 text-white">
              <CheckCircle2 className="size-12 text-emerald-400" />
              <p className="text-sm font-semibold">QR code detected</p>
              <p className="text-xs text-white/60">Identifying patient…</p>
            </motion.div>
          )}
        </AnimatePresence>
        {state === 'starting' && <div className="absolute inset-x-0 bottom-4 text-center text-xs text-white/70">Requesting camera…</div>}
      </div>

      <div className="mx-auto flex max-w-[420px] flex-col gap-3 sm:flex-row sm:items-end">
        {cameras.length > 1 && (
          <Select fieldClassName="flex-1" label="Camera" value={cameraId} onChange={(e) => { setCameraId(e.target.value); start(e.target.value); }} options={cameras.map((c, i) => ({ value: c.id, label: c.label || `Camera ${i + 1}` }))} />
        )}
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => scanFile(e.target.files?.[0])} />
        <Button variant="secondary" icon={ImageUp} className={cameras.length > 1 ? '' : 'w-full'} onClick={() => fileInput.current?.click()}>Scan from image</Button>
      </div>
      {message && state !== 'denied' && state !== 'unavailable' && <p className="text-center text-[13px] text-red-600">{message}</p>}
    </div>
  );
}
