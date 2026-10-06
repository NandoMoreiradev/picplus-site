import 'styled-components';
import type { Theme } from './styles/theme';

declare module 'styled-components' {
  // Module augmentation exige `interface` (um `type` não mescla com o original).
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends Theme {}
}
