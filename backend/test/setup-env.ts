import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Executado antes de qualquer import da aplicação (config lê process.env na carga do módulo).
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.UPLOADS_DIR = mkdtempSync(join(tmpdir(), 'picplus-uploads-'));
delete process.env.RESEND_API_KEY;
