/** Escapa texto vindo de usuários antes de inseri-lo em HTML. */
export function esc(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const nl2br = (value: string) => esc(value).replace(/\n/g, '<br />');

/** Layout base seguindo a identidade visual do site (fundo escuro + verde-limão). */
function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Nunito',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#171717;border:1px solid #262626;border-radius:16px;overflow:hidden;">
          <tr><td style="padding:28px 32px;border-bottom:1px solid #262626;">
            <span style="font-size:26px;font-weight:800;color:#ffffff;">picplus<span style="color:#B6E829;">.</span></span>
          </td></tr>
          <tr><td style="padding:32px;color:#d4d4d4;font-size:16px;line-height:1.65;">
            <h1 style="margin:0 0 16px;font-size:22px;color:#ffffff;">${esc(title)}</h1>
            ${body}
          </td></tr>
          <tr><td style="padding:20px 32px;border-top:1px solid #262626;color:#737373;font-size:12px;">
            PicPlus Company · Este é um e-mail automático.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

const row = (label: string, value?: string | null) =>
  value
    ? `<tr><td style="padding:6px 16px 6px 0;color:#a3a3a3;white-space:nowrap;vertical-align:top;">${esc(label)}</td><td style="padding:6px 0;color:#ffffff;">${nl2br(value)}</td></tr>`
    : '';

const button = (href: string, label: string) =>
  `<p style="margin:24px 0 0;"><a href="${esc(href)}" style="display:inline-block;background:#B6E829;color:#0a0a0a;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:8px;">${esc(label)}</a></p>`;

export const templates = {
  adminNewContact: (data: {
    type: string;
    name: string;
    email: string;
    phone?: string | null;
    company?: string | null;
    serviceInterest?: string | null;
    budgetRange?: string | null;
    message: string;
  }) =>
    layout(
      data.type === 'BUDGET'
        ? 'Novo pedido de orçamento'
        : 'Nova mensagem de contato',
      `<table role="presentation" cellpadding="0" cellspacing="0">
         ${row('Nome', data.name)}
         ${row('E-mail', data.email)}
         ${row('Telefone', data.phone)}
         ${row('Empresa', data.company)}
         ${row('Serviço', data.serviceInterest)}
         ${row('Investimento', data.budgetRange)}
         ${row('Mensagem', data.message)}
       </table>`,
    ),

  adminNewInfluencer: (data: {
    name: string;
    email: string;
    niche?: string | null;
    adminUrl: string;
  }) =>
    layout(
      'Novo cadastro de influenciador',
      `<table role="presentation" cellpadding="0" cellspacing="0">
         ${row('Nome', data.name)}
         ${row('E-mail', data.email)}
         ${row('Nicho', data.niche)}
       </table>
       ${button(data.adminUrl, 'Revisar no painel')}`,
    ),
};
