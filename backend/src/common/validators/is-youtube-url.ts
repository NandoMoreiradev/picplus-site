import { registerDecorator } from 'class-validator';
import type { ValidationOptions } from 'class-validator';
import { extractYoutubeId } from '../utils/youtube';

/** O valor precisa ser um link (ou ID) de vídeo do YouTube. */
export function IsYoutubeUrl(options?: ValidationOptions) {
  return (target: object, propertyName: string) => {
    registerDecorator({
      name: 'isYoutubeUrl',
      target: target.constructor,
      propertyName,
      options: {
        message: 'Informe um link válido de vídeo do YouTube.',
        ...options,
      },
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && extractYoutubeId(value) !== null,
      },
    });
  };
}
