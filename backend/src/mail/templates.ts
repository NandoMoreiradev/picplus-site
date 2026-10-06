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
  influencerReceived: (name: string) =>
    layout(
      'Recebemos o seu cadastro!',
      `<p>Olá, ${esc(name)}!</p>
       <p>Obrigado por querer fazer parte da vitrine de parceiros da PicPlus. Nossa equipe vai analisar o seu perfil e você receberá uma resposta por aqui assim que a avaliação for concluída.</p>`,
    ),

  influencerApproved: (
    name: string,
    showcaseUrl: string,
    onShowcase: boolean,
  ) =>
    layout(
      'Seu cadastro foi aprovado 🎉',
      `<p>Olá, ${esc(name)}!</p>
       <p>Temos ótimas notícias: o seu perfil foi <strong style="color:#B6E829;">aprovado</strong> pela equipe PicPlus.</p>
       ${
         onShowcase
           ? `<p>Seu perfil já está disponível na nossa vitrine de parceiros.</p>${button(showcaseUrl, 'Ver a vitrine')}`
           : '<p>Entraremos em contato assim que surgirem campanhas alinhadas ao seu perfil.</p>'
       }`,
    ),

  influencerRejected: (name: string, reason?: string | null) =>
    layout(
      'Atualização sobre o seu cadastro',
      `<p>Olá, ${esc(name)}!</p>
       <p>Agradecemos o seu interesse na PicPlus. Após a análise, não conseguiremos seguir com o seu cadastro neste momento.</p>
       ${
         reason
           ? `<p style="margin:20px 0;padding:14px 16px;background:#0a0a0a;border-left:3px solid #B6E829;border-radius:4px;"><strong style="color:#ffffff;">Motivo:</strong><br />${nl2br(reason)}</p>`
           : ''
       }
       <p>Você pode atualizar suas informações e se cadastrar novamente no futuro. Desejamos sucesso na sua jornada!</p>`,
    ),

  contactReceived: (name: string, isBudget: boolean) =>
    layout(
      isBudget
        ? 'Recebemos o seu pedido de orçamento'
        : 'Recebemos a sua mensagem',
      `<p>Olá, ${esc(name)}!</p>
       <p>${
         isBudget
           ? 'Já estamos analisando o seu pedido de orçamento. Nossa equipe retornará em breve com uma proposta alinhada ao seu objetivo.'
           : 'Obrigado por entrar em contato. Nossa equipe responderá o mais breve possível.'
       }</p>`,
    ),

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
