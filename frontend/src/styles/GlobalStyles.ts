import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.main};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
  }

  a {
    color: inherit;
    text-decoration: none;
    transition: color ${({ theme }) => theme.transitions.default};
  }

  a:hover {
    color: ${({ theme }) => theme.colors.primary};
  }

  button {
    cursor: pointer;
    font-family: inherit;
    border: none;
    background: none;
  }

  /* Custom Scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.background};
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.surfaceHover};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.primary};
  }
`;
