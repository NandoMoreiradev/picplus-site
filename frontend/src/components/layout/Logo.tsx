import { Link } from 'react-router-dom';
import styled from 'styled-components';
import logoPicplus from '../../assets/logo_picplus.png';

// `size` mantém a escala em rem usada antes (texto); a imagem é 1.3x essa medida de altura.
const LogoLink = styled(Link)<{ $size?: string }>`
  display: inline-flex;
  align-items: center;
  line-height: 0;

  img {
    height: ${({ $size = '2rem' }) => `calc(${$size} * 1.3)`};
    width: auto;
  }
`;

export function Logo({ to = '/', size, label = 'PicPlus — página inicial' }: { to?: string; size?: string; label?: string }) {
  return (
    <LogoLink to={to} $size={size} aria-label={label}>
      <img src={logoPicplus} alt="PicPlus" width={500} height={190} />
    </LogoLink>
  );
}
