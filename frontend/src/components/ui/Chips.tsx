import styled from 'styled-components';

export const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
`;

export const Chip = styled.button<{ $active?: boolean }>`
  padding: 0.5rem 1.1rem;
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.borderStrong)};
  background: ${({ $active, theme }) => ($active ? theme.colors.primary : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.textDark : theme.colors.textSecondary)};
  font-weight: 700;
  font-size: 0.9rem;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ $active, theme }) => ($active ? theme.colors.textDark : theme.colors.primary)};
  }
`;
