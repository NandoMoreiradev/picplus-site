/**
 * Gera as miniaturas (`<uuid>-thumb.webp`, 800 px) das imagens já enviadas antes da
 * otimização. Só cria arquivos novos: nenhuma imagem existente é alterada, então as URLs
 * gravadas no banco e o cache da CDN continuam válidos. Pode ser executado mais de uma vez.
 *
 *   npm run thumbnails:backfill            # usa o R2 se as variáveis R2_* estiverem definidas
 *   npm run thumbnails:backfill -- --dry   # só lista o que seria gerado
 */
import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { config, isR2Enabled } from '../src/config/configuration';

const THUMB_WIDTH = 800;
const ORIGINAL = /^[0-9a-f-]{36}\.(jpe?g|png|webp)$/i;
const dry = process.argv.includes('--dry');

const thumbName = (name: string) =>
  name.replace(/\.(jpe?g|png|webp)$/i, '-thumb.webp');

const makeThumb = (input: Buffer) =>
  sharp(input)
    .rotate()
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();

async function runR2() {
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.r2.accessKeyId,
      secretAccessKey: config.r2.secretAccessKey,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  const exists = async (key: string) => {
    try {
      await s3.send(new HeadObjectCommand({ Bucket: config.r2.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  };

  let created = 0;
  let skipped = 0;
  let token: string | undefined;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: config.r2.bucket,
        Prefix: 'uploads/',
        ContinuationToken: token,
      }),
    );
    for (const { Key } of page.Contents ?? []) {
      const name = Key?.slice('uploads/'.length) ?? '';
      if (!Key || !ORIGINAL.test(name)) continue;
      const thumbKey = `uploads/${thumbName(name)}`;
      if (await exists(thumbKey)) {
        skipped++;
        continue;
      }
      console.log(`${dry ? '[dry] ' : ''}${Key} -> ${thumbKey}`);
      if (dry) continue;
      try {
        const object = await s3.send(
          new GetObjectCommand({ Bucket: config.r2.bucket, Key }),
        );
        const body = Buffer.from(await object.Body!.transformToByteArray());
        await s3.send(
          new PutObjectCommand({
            Bucket: config.r2.bucket,
            Key: thumbKey,
            Body: await makeThumb(body),
            ContentType: 'image/webp',
            CacheControl: 'public, max-age=31536000, immutable',
          }),
        );
        created++;
      } catch (error) {
        console.warn(`  falhou: ${(error as Error).message}`);
      }
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  console.log(`Concluído: ${created} miniaturas criadas, ${skipped} já existiam.`);
}

async function runDisk() {
  const dir = config.uploads.dir;
  if (!existsSync(dir)) {
    console.log(`Pasta ${dir} não existe: nada a fazer.`);
    return;
  }
  let created = 0;
  for (const name of await readdir(dir)) {
    if (!ORIGINAL.test(name)) continue;
    const target = join(dir, thumbName(name));
    if (existsSync(target)) continue;
    console.log(`${dry ? '[dry] ' : ''}${name} -> ${thumbName(name)}`);
    if (dry) continue;
    try {
      await writeFile(target, await makeThumb(await readFile(join(dir, name))));
      created++;
    } catch (error) {
      console.warn(`  falhou: ${(error as Error).message}`);
    }
  }
  console.log(`Concluído: ${created} miniaturas criadas.`);
}

(isR2Enabled() ? runR2() : runDisk()).catch((error) => {
  console.error(error);
  process.exit(1);
});
