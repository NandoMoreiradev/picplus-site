import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import styled from 'styled-components';

const Wrapper = styled.div<{ $visible: boolean; $delay: number }>`
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transform: translateY(${({ $visible }) => ($visible ? '0' : '24px')});
  transition:
    opacity 0.7s ease-out ${({ $delay }) => $delay}ms,
    transform 0.7s ease-out ${({ $delay }) => $delay}ms;
  will-change: opacity, transform;
`;

/** Anima o conteúdo ao entrar na viewport. Respeita prefers-reduced-motion. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Sem IntersectionObserver ou com "reduzir movimento", o conteúdo já nasce visível.
  const [visible, setVisible] = useState(
    () =>
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <Wrapper ref={ref} $visible={visible} $delay={delay} className={className}>
      {children}
    </Wrapper>
  );
}
