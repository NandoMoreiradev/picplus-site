import styled, { css } from 'styled-components';
import DOMPurify from 'dompurify';
import { EditorContent, useEditor } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';

/** Texto sem formatação: o editor devolve "<p></p>" quando vazio. */
export const isEmptyHtml = (html?: string | null) =>
  !html || !html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

/* ── Estilo do texto (editor e leitura) ──────────────── */

const proseStyles = css`
  line-height: 1.65;
  word-break: break-word;

  p {
    margin: 0 0 0.6rem;
  }
  p:last-child {
    margin-bottom: 0;
  }
  ul,
  ol {
    margin: 0 0 0.6rem;
    padding-left: 1.4rem;
  }
  ul {
    list-style: disc;
  }
  ol {
    list-style: decimal;
  }
  li > p {
    margin: 0;
  }
  blockquote {
    margin: 0 0 0.6rem;
    padding-left: 0.9rem;
    border-left: 3px solid ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  code {
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
    background: ${({ theme }) => theme.colors.surfaceHover};
    font-size: 0.88em;
  }
  pre {
    margin: 0 0 0.6rem;
    padding: 0.7rem 0.9rem;
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ theme }) => theme.colors.background};
    overflow-x: auto;
  }
  pre code {
    padding: 0;
    background: none;
  }
  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  h1,
  h2,
  h3 {
    margin: 0.4rem 0 0.5rem;
    font-weight: 800;
    line-height: 1.3;
  }
  h1 {
    font-size: 1.3rem;
  }
  h2 {
    font-size: 1.15rem;
  }
  h3 {
    font-size: 1.02rem;
  }
  hr {
    border: 0;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    margin: 0.8rem 0;
  }
`;

/* ── Leitura (HTML sanitizado) ───────────────────────── */

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'ul', 'ol', 'li',
  'blockquote', 'a', 'code', 'pre', 'h1', 'h2', 'h3', 'hr',
];

// Links abrem em outra aba e não vazam o endereço do painel.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer nofollow');
  }
});

const View = styled.div`
  ${proseStyles}
  font-size: 0.95rem;
`;

/** Mostra o HTML do editor depois de limpá-lo: só tags de texto, nunca scripts ou estilos. */
export function RichTextView({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR: ['href', 'target', 'rel'] });
  return <View dangerouslySetInnerHTML={{ __html: clean }} />;
}

/* ── Editor ──────────────────────────────────────────── */

const Frame = styled.div<{ $compact?: boolean }>`
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.background};
  transition:
    border-color ${({ theme }) => theme.transitions.fast},
    box-shadow ${({ theme }) => theme.transitions.fast};

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primarySoft};
  }

  .ProseMirror {
    ${proseStyles}
    min-height: ${({ $compact }) => ($compact ? '72px' : '140px')};
    max-height: 420px;
    overflow-y: auto;
    padding: 0.7rem 0.9rem;
    font-size: 0.95rem;
    outline: none;
  }
  .ProseMirror p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem;
  padding: 0.3rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  .sep {
    width: 1px;
    margin: 0.25rem 0.3rem;
    background: ${({ theme }) => theme.colors.border};
  }
`;

const Tool = styled.button<{ $on?: boolean }>`
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $on, theme }) => ($on ? theme.colors.primary : theme.colors.textSecondary)};
  background: ${({ $on, theme }) => ($on ? theme.colors.primarySoft : 'transparent')};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.surfaceHover};
    color: ${({ theme }) => theme.colors.text};
  }
  &:disabled {
    opacity: 0.35;
  }
`;

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Endereço do link (deixe vazio para remover)', previous ?? 'https://');
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    // Só http(s), mailto e tel: o editor aceitaria "javascript:" se deixássemos.
    const safe = /^(https?:\/\/|mailto:|tel:)/i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    editor.chain().focus().extendMarkRange('link').setLink({ href: safe }).run();
  };

  const items: { key: string; label: string; icon: typeof Bold; run: () => void; on?: boolean; off?: boolean }[] = [
    { key: 'bold', label: 'Negrito', icon: Bold, run: () => editor.chain().focus().toggleBold().run(), on: editor.isActive('bold') },
    { key: 'italic', label: 'Itálico', icon: Italic, run: () => editor.chain().focus().toggleItalic().run(), on: editor.isActive('italic') },
    { key: 'underline', label: 'Sublinhado', icon: UnderlineIcon, run: () => editor.chain().focus().toggleUnderline().run(), on: editor.isActive('underline') },
    { key: 'strike', label: 'Tachado', icon: Strikethrough, run: () => editor.chain().focus().toggleStrike().run(), on: editor.isActive('strike') },
    { key: 'sep1', label: '', icon: Bold, run: () => undefined },
    { key: 'bullet', label: 'Lista com marcadores', icon: List, run: () => editor.chain().focus().toggleBulletList().run(), on: editor.isActive('bulletList') },
    { key: 'ordered', label: 'Lista numerada', icon: ListOrdered, run: () => editor.chain().focus().toggleOrderedList().run(), on: editor.isActive('orderedList') },
    { key: 'quote', label: 'Citação', icon: Quote, run: () => editor.chain().focus().toggleBlockquote().run(), on: editor.isActive('blockquote') },
    { key: 'link', label: 'Link', icon: Link2, run: setLink, on: editor.isActive('link') },
    { key: 'sep2', label: '', icon: Bold, run: () => undefined },
    { key: 'undo', label: 'Desfazer', icon: Undo2, run: () => editor.chain().focus().undo().run(), off: !editor.can().undo() },
    { key: 'redo', label: 'Refazer', icon: Redo2, run: () => editor.chain().focus().redo().run(), off: !editor.can().redo() },
  ];

  return (
    <Bar role="toolbar" aria-label="Formatação do texto">
      {items.map(({ key, label, icon: Icon, run, on, off }) =>
        label ? (
          <Tool
            key={key}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={on}
            $on={on}
            disabled={off}
            // mousedown mantém o foco (e a seleção) no texto ao clicar no botão
            onMouseDown={(event) => event.preventDefault()}
            onClick={run}
          >
            <Icon size={16} aria-hidden />
          </Tool>
        ) : (
          <span key={key} className="sep" />
        ),
      )}
    </Bar>
  );
}

/**
 * Editor de texto rico (negrito, listas, links…). É "não controlado": recebe só o valor
 * inicial e avisa as mudanças; para limpar o campo, troque a `key` do componente.
 * `onSubmit` é chamado com Ctrl/⌘ + Enter.
 */
export function RichTextEditor({
  initialValue = '',
  onChange,
  onSubmit,
  placeholder = 'Escreva aqui…',
  autoFocus,
  compact,
  label,
}: {
  initialValue?: string;
  onChange?: (html: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  compact?: boolean;
  label: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, protocols: ['http', 'https', 'mailto', 'tel'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialValue,
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': label },
      handleKeyDown: (_view, event) => {
        if (onSubmit && event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          onSubmit();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: current }) => onChange?.(current.isEmpty ? '' : current.getHTML()),
  });

  if (!editor) return null;
  return (
    <Frame $compact={compact}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </Frame>
  );
}
