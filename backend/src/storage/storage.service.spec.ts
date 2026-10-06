// Modo R2 do StorageService, com o cliente S3 simulado (sem rede).

interface SentCommand {
  input: Record<string, unknown>;
}

const send = jest.fn<Promise<unknown>, [SentCommand]>().mockResolvedValue({});

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send })),
  PutObjectCommand: jest
    .fn()
    .mockImplementation((input: unknown) => ({ input })),
  DeleteObjectCommand: jest
    .fn()
    .mockImplementation((input: unknown) => ({ input })),
}));

const R2_ENV = {
  R2_ACCOUNT_ID: 'acc123',
  R2_ACCESS_KEY_ID: 'key',
  R2_SECRET_ACCESS_KEY: 'secret',
  R2_BUCKET: 'picplus-uploads',
  R2_PUBLIC_URL: 'https://cdn.exemplo.com.br/', // barra final deve ser ignorada
  DATABASE_URL: 'postgresql://x',
  JWT_SECRET: 'x'.repeat(40),
};

// PNG 1x1 válido
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const file = (buffer: Buffer) =>
  ({ buffer, size: buffer.length }) as Express.Multer.File;
const sentInput = (call = 0) => send.mock.calls[call][0].input;

/** A config lê process.env na carga do módulo, então cada teste carrega uma cópia isolada. */
function load<T>(
  factory: (modules: {
    storage: typeof import('./storage.service');
    config: typeof import('../config/configuration');
  }) => T,
): T {
  let result!: T;
  jest.isolateModules(() => {
    result = factory({
      storage: jest.requireActual('./storage.service'),
      config: jest.requireActual('../config/configuration'),
    });
  });
  return result;
}
const newService = () => load(({ storage }) => new storage.StorageService());

describe('StorageService (R2)', () => {
  const original = { ...process.env };

  beforeEach(() => {
    send.mockClear();
    Object.assign(process.env, R2_ENV);
  });
  afterAll(() => {
    process.env = original;
  });

  it('envia ao R2 com o tipo detectado e devolve a URL pública', async () => {
    const url = await newService().save(file(PNG), 'image');

    expect(url).toMatch(/^https:\/\/cdn\.exemplo\.com\.br\/uploads\/.+\.png$/);
    const input = sentInput();
    expect(input.Bucket).toBe('picplus-uploads');
    expect(input.Key).toMatch(/^uploads\/.+\.png$/);
    expect(input.ContentType).toBe('image/png');
    expect(input.CacheControl).toContain('immutable');
  });

  it('rejeita arquivo que não é imagem sem tocar no R2', async () => {
    await expect(
      newService().save(
        file(Buffer.from('texto qualquer, não é imagem')),
        'image',
      ),
    ).rejects.toThrow('imagem válida');
    expect(send).not.toHaveBeenCalled();
  });

  it('remove pela chave a partir da URL pública', async () => {
    await newService().remove('https://cdn.exemplo.com.br/uploads/abc.png');
    expect(sentInput()).toEqual({
      Bucket: 'picplus-uploads',
      Key: 'uploads/abc.png',
    });
  });

  it('ignora URLs de outra origem', async () => {
    await newService().remove('https://outro-site.com/uploads/abc.png');
    expect(send).not.toHaveBeenCalled();
  });

  it('falha na inicialização se o R2 estiver parcialmente configurado', () => {
    delete process.env.R2_BUCKET;
    expect(() => load(({ config }) => config.assertConfig())).toThrow(
      /R2 incompleta.*R2_BUCKET/,
    );
  });
});
