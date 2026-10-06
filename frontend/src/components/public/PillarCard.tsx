import styled from 'styled-components';
import { Check } from 'lucide-react';
import type { positioning } from '../../content/positioning';
import { Card } from '../ui/Layout';
import { ServiceIcon } from '../ui/icons';

type Pillar = (typeof positioning.pillars)[number];

const Box = styled(Card)`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  padding: 2rem 1.75rem;
  overflow: hidden;

  &::before {
    content: attr(data-number);
    position: absolute;
    top: 0.75rem;
    right: 1.25rem;
    font-size: 4.5rem;
    font-weight: 900;
    line-height: 1;
    color: ${({ theme }) => theme.colors.surfaceHover};
    pointer-events: none;
  }
  .icon {
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ theme }) => theme.colors.primarySoft};
    color: ${({ theme }) => theme.colors.primary};
    transition: all ${({ theme }) => theme.transitions.default};
  }
  &:hover .icon {
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.textDark};
  }
  .nick {
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  h3 {
    font-size: 1.45rem;
    font-weight: 800;
    margin-top: -0.5rem;
  }
  p {
    color: ${({ theme }) => theme.colors.textSecondary};
    line-height: 1.7;
  }
  ul {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
  li {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    font-size: 0.92rem;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  li svg {
    flex-shrink: 0;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

/** Um dos três pilares do hub (Bússola, Motor, Megafone). */
export function PillarCard({ pillar, index }: { pillar: Pillar; index: number }) {
  return (
    <Box $interactive data-number={`0${index + 1}`}>
      <div className="icon">
        <ServiceIcon icon={pillar.icon} size={28} aria-hidden />
      </div>
      <span className="nick">{pillar.nickname}</span>
      <h3>{pillar.name}</h3>
      <p>{pillar.pitch}</p>
      <ul>
        {pillar.bullets.map((bullet) => (
          <li key={bullet}>
            <Check size={16} aria-hidden /> {bullet}
          </li>
        ))}
      </ul>
    </Box>
  );
}
