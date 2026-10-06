/**
 * Monta um link wa.me com a mensagem pré-preenchida.
 * Números com 10–11 dígitos são tratados como brasileiros (prefixo 55).
 */
export function buildWhatsAppLink(
  phone: string | null | undefined,
  message: string,
): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (digits.length <= 11) digits = `55${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
