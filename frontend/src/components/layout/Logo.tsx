import { Link } from 'react-router-dom';
import styled from 'styled-components';

const LogoLink = styled(Link)<{ $size?: string }>`
  font-size: ${({ $size = '2rem' }) => $size};
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  color: ${({ theme }) => theme.colors.text};

  span {
    color: ${({ theme }) => theme.colors.primary};
  }
  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

export function Logo({ to = '/', size, label = 'PicPlus — página inicial' }: { to?: string; size?: string; label?: string }) {
  return (
    <LogoLink to={to} $size={size} aria-label={label}>
      picplus<span>.</span>
    </LogoLink>
  );
}
