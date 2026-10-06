import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca uma rota/controller como pública (dispensa o JWT global). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
