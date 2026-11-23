export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Converte Markdown simples em HTML limpo compatível com o TipTap das tarefas. */
export function simpleMarkdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };

  const inline = (line: string) =>
    escapeHtml(line)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      continue;
    }
    if (line.startsWith('### ')) {
      closeList();
      html.push(`<h3>${inline(line.slice(4))}</h3>`);
    } else if (line.startsWith('## ')) {
      closeList();
      html.push(`<h2>${inline(line.slice(3))}</h2>`);
    } else if (line.startsWith('# ')) {
      closeList();
      html.push(`<h2>${inline(line.slice(2))}</h2>`);
    } else if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`);
    } else {
      closeList();
      html.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return html.join('');
}

/** Normaliza data ISO ou YYYY-MM-DD para meia-noite UTC (padrão dos prazos em Tasks). */
export function parseUtcDateOnly(value?: string | null): Date | null {
  if (!value) return null;
  const datePart = value.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return new Date(`${datePart}T00:00:00.000Z`);
}

export function buildPlannerTaskDescriptionHtml(item: {
  channel: string;
  funnelStage?: string | null;
  pillar?: string | null;
  hook?: string | null;
  briefing?: string | null;
  copyDraft?: string | null;
  cta?: string | null;
}): string {
  const sections: string[] = [];
  const metaParts = [
    `<strong>Canal:</strong> ${escapeHtml(item.channel)}`,
    item.funnelStage
      ? `<strong>Funil:</strong> ${escapeHtml(item.funnelStage)}`
      : null,
    item.pillar ? `<strong>Pilar:</strong> ${escapeHtml(item.pillar)}` : null,
  ].filter(Boolean);

  sections.push(`<p>${metaParts.join(' · ')}</p>`);

  if (item.hook?.trim()) {
    sections.push(
      `<h3>Gancho (Hook)</h3><p>${escapeHtml(item.hook.trim()).replace(/\n/g, '<br />')}</p>`,
    );
  }
  if (item.briefing?.trim()) {
    sections.push(
      `<h3>Briefing de Produção</h3>${simpleMarkdownToHtml(item.briefing.trim())}`,
    );
  }
  if (item.copyDraft?.trim()) {
    sections.push(
      `<h3>Rascunho de Copy / Legenda</h3>${simpleMarkdownToHtml(item.copyDraft.trim())}`,
    );
  }
  if (item.cta?.trim()) {
    sections.push(
      `<p><strong>CTA:</strong> ${escapeHtml(item.cta.trim())}</p>`,
    );
  }

  return sections.join('');
}
