import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Disco local (sem R2), em pasta temporária.
const dir = mkdtempSync(join(tmpdir(), 'picplus-video-'));
process.env.UPLOADS_DIR = dir;
for (const name of [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_PUBLIC_URL',
]) {
  delete process.env[name];
}

import { StorageService } from './storage.service';

/** Cabeçalho mínimo de um arquivo ISO-BMFF: [tamanho][ftyp][marca]... */
const ftyp = (brand: string, extra = 32) =>
  Buffer.concat([
    Buffer.from([0, 0, 0, 0x20]),
    Buffer.from('ftyp', 'ascii'),
    Buffer.from(brand, 'ascii'),
    Buffer.alloc(extra),
  ]);
const WEBM = Buffer.concat([
  Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
  Buffer.alloc(40),
]);
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(40),
]);

const file = (buffer: Buffer, size = buffer.length) =>
  ({ buffer, size }) as Express.Multer.File;

describe('StorageService: vídeo', () => {
  const service = new StorageService();

  it.each([
    ['MP4 (isom)', ftyp('isom'), '.mp4'],
    ['MP4 (mp42)', ftyp('mp42'), '.mp4'],
    ['MP4 (avc1)', ftyp('avc1'), '.mp4'],
    ['MOV (QuickTime)', ftyp('qt  '), '.mov'],
    ['WebM', WEBM, '.webm'],
  ])('aceita %s e grava com a extensão certa', async (_label, buffer, ext) => {
    const url = await service.save(file(buffer), 'video');
    expect(url.endsWith(ext)).toBe(true);
    expect(readdirSync(dir).some((name) => name.endsWith(ext))).toBe(true);
  });

  it.each([
    ['HEIC (também usa ftyp)', ftyp('heic')],
    ['AVIF (também usa ftyp)', ftyp('avif')],
    ['imagem PNG', PNG],
    ['texto', Buffer.from('isto não é um vídeo, só texto qualquer')],
  ])('recusa %s como vídeo', async (_label, buffer) => {
    await expect(service.save(file(buffer), 'video')).rejects.toThrow(
      'vídeo válido',
    );
  });

  it('um vídeo não passa como imagem nem como PDF', async () => {
    await expect(service.save(file(ftyp('isom')), 'image')).rejects.toThrow(
      'imagem válida',
    );
    await expect(service.save(file(ftyp('isom')), 'pdf')).rejects.toThrow(
      'PDF válido',
    );
  });

  it('limita o vídeo a 50 MB', async () => {
    const big = file(ftyp('isom'), 51 * 1024 * 1024);
    await expect(service.save(big, 'video')).rejects.toThrow('50 MB');
  });

  it('isOwnUrl só reconhece arquivos que nós armazenamos', () => {
    expect(service.isOwnUrl('/uploads/abc.mp4')).toBe(true);
    expect(service.isOwnUrl('https://outro-site.com/video.mp4')).toBe(false);
    expect(service.isOwnUrl('//evil.com/uploads/x.mp4')).toBe(false);
    expect(service.isOwnUrl('/outra-pasta/x.mp4')).toBe(false);
  });
});
