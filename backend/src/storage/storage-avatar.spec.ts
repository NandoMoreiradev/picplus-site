import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

// Disco local (sem R2), em pasta temporária.
const dir = mkdtempSync(join(tmpdir(), 'picplus-avatar-'));
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

const asFile = (buffer: Buffer) =>
  ({ buffer, size: buffer.length }) as Express.Multer.File;

describe('StorageService: foto de perfil', () => {
  it('recorta em quadrado de 256 px e salva como WebP', async () => {
    const wide = await sharp({
      create: {
        width: 800,
        height: 400,
        channels: 3,
        background: { r: 20, g: 90, b: 200 },
      },
    })
      .jpeg()
      .toBuffer();

    const url = await new StorageService().saveAvatar(asFile(wide));

    expect(url.endsWith('.webp')).toBe(true);
    const [name] = readdirSync(dir);
    const meta = await sharp(readFileSync(join(dir, name))).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(256);
    expect(meta.height).toBe(256);
  });

  it('recusa arquivo que não é imagem', async () => {
    const pdf = Buffer.from(
      '%PDF-1.4 conteúdo qualquer para passar de 12 bytes',
    );
    await expect(new StorageService().saveAvatar(asFile(pdf))).rejects.toThrow(
      'Envie uma imagem válida',
    );
  });
});
