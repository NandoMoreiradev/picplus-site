import { Injectable, Logger } from '@nestjs/common';
import { esc } from '../mail/templates';
import { config } from '../config/configuration';

export interface EmailBlockStyle {
  backgroundColor?: string;
  textColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: string;
  fontWeight?: string;
  padding?: string;
  borderRadius?: string;
  buttonColor?: string;
  buttonTextColor?: string;
}

export interface EmailBlock {
  id: string;
  type:
    | 'heading'
    | 'text'
    | 'button'
    | 'image'
    | 'divider'
    | 'spacer'
    | 'list'
    | 'callout';
  props: {
    text?: string;
    html?: string;
    label?: string;
    href?: string;
    src?: string;
    alt?: string;
    height?: number;
    items?: string[];
    level?: 'h1' | 'h2' | 'h3';
  };
  style?: EmailBlockStyle;
}

export interface EmailGlobalSettings {
  backgroundColor?: string;
  cardBackgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  footerText?: string;
}

export interface EmailDesignJson {
  blocks: EmailBlock[];
  settings?: EmailGlobalSettings;
}

export type MergeTagContext = Record<string, unknown>;

/**
 * Renderizador de templates de e-mail (inspirado no módulo de e-mails do Maskot Edu,
 * adaptado para a identidade visual escura + verde-limão da PicPlus).
 */
@Injectable()
export class EmailRendererService {
  private readonly logger = new Logger(EmailRendererService.name);

  /** Substitui variáveis {{chave}} ou {{grupo.chave}} no texto/HTML. */
  replaceMergeTags(
    template: string,
    context: MergeTagContext,
    escapeValues = true,
  ): string {
    if (!template) return '';
    const flat = this.flattenContext(context);
    return template.replace(
      /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g,
      (_match, key: string) => {
        const val = flat[key];
        if (val === undefined || val === null) return '';
        return escapeValues ? esc(val) : String(val);
      },
    );
  }

  private flattenContext(
    obj: Record<string, unknown>,
    prefix = '',
  ): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        Object.assign(
          out,
          this.flattenContext(v as Record<string, unknown>, fullKey),
        );
      } else if (
        typeof v === 'string' ||
        typeof v === 'number' ||
        typeof v === 'boolean'
      ) {
        out[fullKey] = String(v);
      }
    }
    return out;
  }

  /** Renderiza a estrutura de blocos (designJson) em HTML do corpo do e-mail. */
  renderDesignJson(
    design: EmailDesignJson,
    context: MergeTagContext = {},
  ): string {
    const blocks = Array.isArray(design?.blocks) ? design.blocks : [];
    const accent = design?.settings?.accentColor || '#B6E829';

    return blocks
      .map((block) => this.renderBlock(block, context, accent))
      .join('\n');
  }

  private renderBlock(
    block: EmailBlock,
    context: MergeTagContext,
    defaultAccent: string,
  ): string {
    const style = block.style ?? {};
    const align = style.textAlign ?? 'left';

    switch (block.type) {
      case 'heading': {
        const tag = block.props.level ?? 'h2';
        const fontSize =
          style.fontSize ??
          (tag === 'h1' ? '24px' : tag === 'h2' ? '20px' : '17px');
        const color = style.textColor ?? '#ffffff';
        const text = this.replaceMergeTags(block.props.text ?? '', context);
        return `<${tag} style="margin:0 0 14px;font-size:${esc(fontSize)};font-weight:800;color:${esc(color)};text-align:${esc(align)};line-height:1.3;">${text}</${tag}>`;
      }

      case 'text': {
        const color = style.textColor ?? '#d4d4d4';
        const fontSize = style.fontSize ?? '15px';
        const raw = block.props.html ?? block.props.text ?? '';
        const content = block.props.html
          ? this.replaceMergeTags(raw, context)
          : this.replaceMergeTags(raw, context).replace(/\n/g, '<br />');
        return `<div style="margin:0 0 16px;font-size:${esc(fontSize)};color:${esc(color)};text-align:${esc(align)};line-height:1.65;">${content}</div>`;
      }

      case 'callout': {
        const bg = style.backgroundColor ?? '#0a0a0a';
        const border = style.buttonColor ?? defaultAccent;
        const color = style.textColor ?? '#e5e5e5';
        const text = this.replaceMergeTags(
          block.props.text ?? '',
          context,
        ).replace(/\n/g, '<br />');
        return `<div style="margin:18px 0;padding:16px 18px;background:${esc(bg)};border-left:4px solid ${esc(border)};border-radius:8px;color:${esc(color)};font-size:14px;line-height:1.6;">${text}</div>`;
      }

      case 'button': {
        const bg = style.buttonColor ?? defaultAccent;
        const fg = style.buttonTextColor ?? '#0a0a0a';
        const radius = style.borderRadius ?? '8px';
        const href = this.replaceMergeTags(
          block.props.href ?? '#',
          context,
          false,
        );
        const label = this.replaceMergeTags(
          block.props.label ?? 'Acessar agora',
          context,
        );
        return `<div style="margin:24px 0;text-align:${esc(align)};">
          <a href="${esc(href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:${esc(bg)};color:${esc(fg)};font-weight:800;font-size:15px;text-decoration:none;padding:13px 26px;border-radius:${esc(radius)};">${label}</a>
        </div>`;
      }

      case 'image': {
        const src = this.replaceMergeTags(
          block.props.src ?? '',
          context,
          false,
        );
        if (!src) return '';
        const alt = this.replaceMergeTags(block.props.alt ?? '', context);
        const radius = style.borderRadius ?? '10px';
        return `<div style="margin:18px 0;text-align:${esc(align)};">
          <img src="${esc(src)}" alt="${alt}" style="max-width:100%;height:auto;border-radius:${esc(radius)};display:inline-block;" />
        </div>`;
      }

      case 'list': {
        const items = Array.isArray(block.props.items) ? block.props.items : [];
        if (!items.length) return '';
        const color = style.textColor ?? '#d4d4d4';
        const li = items
          .map(
            (item) =>
              `<li style="margin-bottom:8px;">${this.replaceMergeTags(item, context)}</li>`,
          )
          .join('');
        return `<ul style="margin:0 0 18px;padding-left:20px;color:${esc(color)};font-size:15px;line-height:1.6;">${li}</ul>`;
      }

      case 'divider':
        return `<hr style="border:0;border-top:1px solid #262626;margin:22px 0;" />`;

      case 'spacer': {
        const h = Math.min(Math.max(Number(block.props.height ?? 20), 4), 120);
        return `<div style="height:${h}px;line-height:${h}px;font-size:1px;">&nbsp;</div>`;
      }

      default:
        return '';
    }
  }

  /** Envolve o conteúdo no layout de e-mail oficial da PicPlus / PicPlus Academy. */
  wrapInBrandLayout(
    innerHtml: string,
    settings?: EmailGlobalSettings,
    context: MergeTagContext = {},
  ): string {
    const bg = settings?.backgroundColor || '#0a0a0a';
    const cardBg = settings?.cardBackgroundColor || '#171717';
    const textColor = settings?.textColor || '#d4d4d4';
    const footer = this.replaceMergeTags(
      settings?.footerText ||
        'PicPlus Company · PicPlus Academy · Este é um e-mail automático.',
      context,
    );

    return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:${esc(bg)};font-family:'Nunito',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${esc(bg)};padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${esc(cardBg)};border:1px solid #262626;border-radius:16px;overflow:hidden;">
          <tr><td style="padding:26px 32px;border-bottom:1px solid #262626;">
            <img src="${esc(config.frontendUrl)}/logo_picplus.png" alt="picplus" height="40" style="display:block;height:40px;width:auto;border:0;" />
          </td></tr>
          <tr><td style="padding:32px;color:${esc(textColor)};font-size:15px;line-height:1.65;">
            ${innerHtml}
          </td></tr>
          <tr><td style="padding:20px 32px;border-top:1px solid #262626;color:#737373;font-size:12px;text-align:center;">
            ${footer}
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  }
}
