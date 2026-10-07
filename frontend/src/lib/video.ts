export interface VideoProbe {
  /** O navegador conseguiu ler o vídeo? (false: codec/arquivo que pode não tocar em todo lugar) */
  readable: boolean;
  /** Mais alto que largo (9:16): define a moldura do player. */
  vertical: boolean;
  duration: number;
  /** Quadro do vídeo em JPEG, para usar como capa. Null se não deu para capturar. */
  poster: Blob | null;
}

const FAILED: VideoProbe = { readable: false, vertical: true, duration: 0, poster: null };
const POSTER_MAX_WIDTH = 720;

/**
 * Lê um vídeo local, sem enviá-lo: descobre a orientação e captura um quadro como capa.
 * Também serve de teste de compatibilidade: se o navegador não decodifica o arquivo
 * (ex.: HEVC/H.265), `readable` vem false e o painel avisa antes de publicar.
 */
export function probeVideo(file: File): Promise<VideoProbe> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    let finished = false;
    const finish = (result: VideoProbe) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      video.load();
      resolve(result);
    };
    const timer = setTimeout(() => finish(FAILED), 10_000);

    video.onerror = () => finish(FAILED);
    video.onloadeddata = () => {
      // Um pouco depois do início costuma evitar o primeiro quadro preto.
      video.currentTime = Math.min(1, (video.duration || 1) / 2);
    };
    video.onseeked = () => {
      const vertical = video.videoHeight > video.videoWidth;
      const base = { readable: true, vertical, duration: video.duration };

      const scale = Math.min(1, POSTER_MAX_WIDTH / video.videoWidth);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const context = canvas.getContext('2d');
      if (!context) return finish({ ...base, poster: null });

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => finish({ ...base, poster: blob }), 'image/jpeg', 0.85);
    };
    video.src = url;
  });
}
