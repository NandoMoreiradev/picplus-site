import { registerDecorator } from 'class-validator';
import type { ValidationOptions } from 'class-validator';
import { isValidBrPhone } from '../utils/phone';

/** Valida telefone brasileiro (ver utils/phone.ts). Aplique depois de um @Transform que faça trim. */
export function IsBrPhone(options?: ValidationOptions) {
  return (target: object, propertyName: string) => {
    registerDecorator({
      name: 'isBrPhone',
      target: target.constructor,
      propertyName,
      options: { message: 'Informe um telefone válido, com DDD.', ...options },
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && isValidBrPhone(value),
      },
    });
  };
}

/** Pelo menos duas letras (de qualquer alfabeto): barra nomes como "12", "@@" ou "!!!". */
export const NAME_PATTERN = /\p{L}[^\p{L}]*\p{L}/u;
