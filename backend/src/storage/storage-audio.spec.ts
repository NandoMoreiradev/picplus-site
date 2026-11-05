import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Disco local (sem R2), em pasta temporária.
const dir = mkdtempSync(join(tmpdir(), 'picplus-audio-'));
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

const WEBM = Buffer.concat([
  Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
  Buffer.alloc(40),
]);
const MP4 = Buffer.concat([
  Buffer.from([0, 0, 0, 0x20]),
  Buffer.from('ftypisom', 'ascii'),
  Buffer.alloc(32),
]);
const OGG = Buffer.concat([Buffer.from('OggS', 'ascii'), Buffer.alloc(40)]);
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(40),
]);

const file = (buffer: Buffer) =>
  ({ buffer, size: buffer.length }) as Express.Multer.File;

describe('StorageService: áudio', () => {
  const storage = new StorageService();

  it('aceita WebM, MP4 e OGG como áudio', async () => {
    expect((await storage.saveAny(file(WEBM), ['audio'])).mime).toBe(
      'audio/webm',
    );
    expect((await storage.saveAny(file(MP4), ['audio'])).mime).toBe(
      'audio/mp4',
    );
    expect((await storage.saveAny(file(OGG), ['audio'])).mime).toBe(
      'audio/ogg',
    );
  });

  it('continua tratando WebM como vídeo quando vídeo é aceito', async () => {
    expect((await storage.saveAny(file(WEBM), ['video'])).mime).toBe(
      'video/webm',
    );
  });

  it('recusa imagem quando só áudio é aceito', async () => {
    await expect(storage.saveAny(file(PNG), ['audio'])).rejects.toThrow(
      /áudio válido/,
    );
  });
});
