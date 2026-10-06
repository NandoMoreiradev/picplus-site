import Markdown from 'react-markdown';
import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: 1.1rem;
  line-height: 1.85;
  color: ${({ theme }) => theme.colors.textSecondary};
  overflow-wrap: anywhere;

  > * + * {
    margin-top: 1.4rem;
  }
  h1 {
    font-size: 2rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.text};
  }
  h2 {
    font-size: 1.75rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.text};
    margin-top: 2.5rem;
  }
  h3 {
    font-size: 1.3rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.text};
    margin-top: 2rem;
  }
  strong {
    color: ${({ theme }) => theme.colors.text};
  }
  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  ul,
  ol {
    padding-left: 1.5rem;
  }
  ul {
    list-style: disc;
  }
  ol {
    list-style: decimal;
  }
  li + li {
    margin-top: 0.5rem;
  }
  li::marker {
    color: ${({ theme }) => theme.colors.primary};
  }
  blockquote {
    padding: 0.5rem 0 0.5rem 1.4rem;
    border-left: 3px solid ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.text};
    font-size: 1.2rem;
    font-style: italic;
  }
  code {
    padding: 0.15rem 0.45rem;
    border-radius: 6px;
    background: ${({ theme }) => theme.colors.surfaceHover};
    font-size: 0.9em;
  }
  pre {
    padding: 1rem 1.25rem;
    overflow-x: auto;
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ theme }) => theme.colors.surface};
    border: 1px solid ${({ theme }) => theme.colors.border};
  }
  pre code {
    padding: 0;
    background: none;
  }
  img {
    border-radius: ${({ theme }) => theme.radii.lg};
    margin: 2rem auto;
  }
  hr {
    border: none;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    margin: 2.5rem 0;
  }
`;

/**
 * Renderiza Markdown com a tipografia do site.
 * react-markdown não interpreta HTML cru, então o conteúdo é seguro contra XSS.
 */
export function Prose({ children }: { children: string }) {
  return (
    <Wrapper>
      <Markdown
        components={{
          a: ({ href, children: content }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {content}
            </a>
          ),
        }}
      >
        {children}
      </Markdown>
    </Wrapper>
  );
}
