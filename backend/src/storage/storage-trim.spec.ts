import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

// Disco local (sem R2), em pasta temporária.
const dir = mkdtempSync(join(tmpdir(), 'picplus-trim-'));
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

/** 200x120 transparente com um quadrado vermelho 40x30 deslocado (margens desiguais). */
async function paddedLogo(): Promise<Buffer> {
  const square = await sharp({
    create: {
      width: 40,
      height: 30,
      channels: 4,
      background: { r: 220, g: 30, b: 30, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: 200,
      height: 120,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: square, left: 120, top: 70 }])
    .png()
    .toBuffer();
}

const asFile = (buffer: Buffer) =>
  ({ buffer, size: buffer.length }) as Express.Multer.File;

const savedSize = async () => {
  const [name] = readdirSync(dir);
  return sharp(readFileSync(join(dir, name))).metadata();
};

describe('StorageService: recorte de margens', () => {
  it('recorta as margens vazias quando trim=true', async () => {
    await new StorageService().save(asFile(await paddedLogo()), 'image', {
      trim: true,
    });
    const meta = await savedSize();
    expect(meta.width).toBe(40);
    expect(meta.height).toBe(30);
    expect(meta.format).toBe('png');
  });

  it('não altera a imagem quando trim não é pedido', async () => {
    const before = new Set(readdirSync(dir));
    await new StorageService().save(asFile(await paddedLogo()), 'image');
    const created = readdirSync(dir).find((name) => !before.has(name));
    const meta = await sharp(
      readFileSync(join(dir, created as string)),
    ).metadata();
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(120);
  });
});
