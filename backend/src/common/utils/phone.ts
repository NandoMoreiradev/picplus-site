/**
 * Telefone brasileiro.
 *
 * Aceita com ou sem máscara e com o DDI 55 opcional: "(11) 98888-7777",
 * "11988887777", "+55 11 98888-7777". Devolve os dígitos nacionais (DDD + número)
 * ou null quando o valor não parece um telefone real.
 */
export function normalizeBrPhone(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (
    (digits.length === 12 || digits.length === 13) &&
    digits.startsWith('55')
  ) {
    digits = digits.slice(2);
  }
  if (digits.length !== 10 && digits.length !== 11) return null;

  const ddd = digits.slice(0, 2);
  // DDDs vão de 11 a 99 e nenhum termina em 0 (10, 20, 30...).
  if (Number(ddd) < 11 || ddd[1] === '0') return null;

  const subscriber = digits.slice(2);
  // Celular tem 9 dígitos e começa com 9; fixo tem 8 e não começa com 0 ou 1.
  if (digits.length === 11 && subscriber[0] !== '9') return null;
  if (digits.length === 10 && /^[01]/.test(subscriber)) return null;
  // 00000000, 99999999...: número "preenchido" só para passar no formulário.
  if (/^(\d)\1+$/.test(subscriber)) return null;

  return digits;
}

export const isValidBrPhone = (input: string): boolean =>
  normalizeBrPhone(input) !== null;
