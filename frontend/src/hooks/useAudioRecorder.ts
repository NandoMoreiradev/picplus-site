import { useCallback, useEffect, useRef, useState } from 'react';
import { pickRecordingMime } from '../lib/audio';

export interface RecordedClip {
  blob: Blob;
  /** Duração em segundos. */
  duration: number;
  mime: string;
}

/** Limite de uma gravação (também protege o tamanho do arquivo enviado). */
export const MAX_RECORDING_SECONDS = 5 * 60;

/**
 * Grava áudio do microfone com MediaRecorder. `onFinish` recebe o arquivo quando a gravação
 * termina (por "parar" ou ao atingir o limite). Libera o microfone sempre que termina ou sai da tela.
 */
export function useAudioRecorder(onFinish: (clip: RecordedClip) => void) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');

  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const timer = useRef<number | null>(null);
  const discard = useRef(false);
  const finish = useRef(onFinish);
  useEffect(() => {
    finish.current = onFinish;
  });

  const release = useCallback(() => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }, []);

  const stop = useCallback(() => {
    if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop();
  }, []);

  const start = useCallback(async () => {
    setError('');
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = media;
      const mime = pickRecordingMime();
      const instance = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
      recorder.current = instance;
      chunks.current = [];
      discard.current = false;

      instance.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      instance.onstop = () => {
        const duration = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
        const type = instance.mimeType || mime || 'audio/webm';
        release();
        setRecording(false);
        if (!discard.current && chunks.current.length > 0) {
          finish.current({ blob: new Blob(chunks.current, { type }), duration, mime: type });
        }
      };

      startedAt.current = Date.now();
      setSeconds(0);
      setRecording(true);
      instance.start();
      timer.current = window.setInterval(() => {
        const elapsed = Math.round((Date.now() - startedAt.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= MAX_RECORDING_SECONDS) stop();
      }, 250);
    } catch (err) {
      release();
      setRecording(false);
      const denied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      const missing = err instanceof DOMException && err.name === 'NotFoundError';
      setError(
        denied
          ? 'Permita o uso do microfone no navegador para gravar.'
          : missing
            ? 'Nenhum microfone encontrado.'
            : 'Não foi possível iniciar a gravação.',
      );
    }
  }, [release, stop]);

  // Sair da tela no meio da gravação descarta o áudio e libera o microfone.
  useEffect(
    () => () => {
      discard.current = true;
      if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop();
      release();
    },
    [release],
  );

  return { recording, seconds, error, start, stop };
}
