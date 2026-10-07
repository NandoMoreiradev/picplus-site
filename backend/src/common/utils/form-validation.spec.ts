import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SubmitContactDto } from '../../contacts/dto/contact.dto';
import { RegisterInfluencerDto } from '../../influencers/dto/influencer.dto';
import { normalizeBrPhone } from './phone';
import { normalizeSocial } from './social';

const influencer = {
  name: 'Ana Lima',
  email: 'ana@exemplo.com',
  whatsapp: '(11) 98888-7777',
  niche: 'Moda',
  acceptTerms: 'true',
};
const contact = {
  name: 'Maria Souza',
  email: 'maria@empresa.com',
  message: 'Gostaria de um orçamento.',
};

/** Campos que falharam na validação ([] = tudo válido). */
async function invalid(cls: new () => object, body: object): Promise<string[]> {
  const errors = await validate(plainToInstance(cls, body));
  return errors.map((error) => error.property);
}

describe('telefone brasileiro', () => {
  it.each([
    '(11) 98888-7777',
    '11988887777',
    '+55 11 98888-7777',
    '55 (11) 98888-7777',
    '(21) 3333-4444', // fixo
    '  (11) 98888-7777  ',
  ])('aceita %s', (value) => {
    expect(normalizeBrPhone(value)).not.toBeNull();
  });

  it.each([
    ['só pontuação', '((((((((((('],
    ['só hífens', '-----------'],
    ['só zeros', '00000000000'],
    ['número "preenchido"', '(11) 99999-9999'],
    ['poucos dígitos', '12345'],
    ['9 dígitos', '(11) 8888-777'],
    ['DDD inexistente (10)', '(10) 98888-7777'],
    ['DDD inexistente (20)', '(20) 98888-7777'],
    ['celular sem o 9', '(11) 88888-7777'],
    ['fixo começando em 0', '(11) 0333-4444'],
    ['letras', 'abc-def-ghij'],
    ['dígitos demais', '(11) 98888-7777-123'],
  ])('recusa %s', (_label, value) => {
    expect(normalizeBrPhone(value)).toBeNull();
  });
});

describe('cadastro de influenciador', () => {
  it('aceita um cadastro válido', async () => {
    expect(await invalid(RegisterInfluencerDto, influencer)).toEqual([]);
  });

  it.each([
    ['e-mail sem domínio', { email: 'ana@' }],
    ['e-mail sem @', { email: 'ana.exemplo.com' }],
    ['e-mail com espaço', { email: 'ana lima@exemplo.com' }],
    ['WhatsApp inválido', { whatsapp: '((((((((((' }],
    ['nome só com números', { name: '12' }],
    ['nome só com símbolos', { name: '@@' }],
    ['nome curto demais', { name: 'A' }],
    ['sem aceite dos termos', { acceptTerms: 'false' }],
  ])('recusa: %s', async (_label, patch) => {
    expect(
      (await invalid(RegisterInfluencerDto, { ...influencer, ...patch }))
        .length,
    ).toBeGreaterThan(0);
  });

  it('normaliza e-mail para minúsculas e remove espaços', () => {
    const dto = plainToInstance(RegisterInfluencerDto, {
      ...influencer,
      email: '  ANA@Exemplo.COM ',
    });
    expect(dto.email).toBe('ana@exemplo.com');
  });
});

describe('contato e orçamento', () => {
  it('aceita sem telefone (opcional) e com telefone válido', async () => {
    expect(await invalid(SubmitContactDto, contact)).toEqual([]);
    expect(
      await invalid(SubmitContactDto, { ...contact, phone: '(11) 98888-7777' }),
    ).toEqual([]);
  });

  it.each([
    ['telefone inválido', { phone: '00000000000' }],
    ['e-mail inválido', { email: 'maria@empresa' }],
    ['mensagem curta', { message: 'oi' }],
    ['nome sem letras', { name: '123' }],
    ['tipo inexistente', { type: 'OUTRO' }],
  ])('recusa: %s', async (_label, patch) => {
    expect(
      (await invalid(SubmitContactDto, { ...contact, ...patch })).length,
    ).toBeGreaterThan(0);
  });
});

describe('redes sociais', () => {
  it.each([
    ['instagram', '@ana.lima', 'https://instagram.com/ana.lima'],
    ['instagram', 'ana.lima', 'https://instagram.com/ana.lima'],
    [
      'instagram',
      'http://www.instagram.com/ana',
      'https://www.instagram.com/ana',
    ],
    ['youtube', 'https://youtu.be/abc123', 'https://youtu.be/abc123'],
    ['twitter', 'https://twitter.com/ana', 'https://twitter.com/ana'],
    ['tiktok', '@ana', 'https://tiktok.com/@ana'],
  ] as const)('%s: aceita %s', (network, input, expected) => {
    expect(normalizeSocial(network, input)).toBe(expected);
  });

  it.each([
    ['instagram', 'https://site-falso.com/ana'],
    ['instagram', 'https://instagram.com.golpe.com/ana'], // domínio parecido
    ['youtube', 'https://evil.com'],
    ['instagram', 'javascript:alert(1)'],
    ['instagram', 'data:text/html,<script>1</script>'],
    ['instagram', 'ana lima com espaço'],
    ['twitch', 'https://instagram.com/ana'], // link de outra rede
  ] as const)('%s: recusa %s', (network, input) => {
    expect(() => normalizeSocial(network, input)).toThrow();
  });
});
