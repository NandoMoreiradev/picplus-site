import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { LandingPagesService } from './client-ai/landing-pages.service';
import { assertConfig, config } from './config/configuration';

async function bootstrap() {
  assertConfig();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Atrás de proxy (Render, Railway, Nginx...) o IP real vem de X-Forwarded-For; necessário ao rate limit.
  if (config.isProduction) app.set('trust proxy', 1);

  // Hospedagem pública de Landing Pages (por slug /lp/:slug ou domínio personalizado no header Host).
  // Registrado antes do helmet para permitir estilos, fontes e script de captura de leads da própria LP.
  const landingPages = app.get(LandingPagesService);
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (
      req.method !== 'GET' ||
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads')
    ) {
      return next();
    }

    const lpMatch = req.path.match(/^\/lp\/([a-z0-9-]+)\/?$/i);
    if (lpMatch) {
      void landingPages
        .findPublishedBySlugHtml(lpMatch[1].toLowerCase())
        .then((html) => {
          if (!html) return next();
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Cache-Control', 'public, max-age=60');
          res.status(200).send(html);
        })
        .catch(next);
      return;
    }

    if (req.path === '/' || req.path === '') {
      const forwardedHost = req.headers['x-forwarded-host'];
      const rawHost =
        (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) ??
        req.headers.host ??
        '';
      if (rawHost) {
        void landingPages
          .findPublishedForHostHtml(rawHost)
          .then((html) => {
            if (!html) return next();
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=60');
            res.status(200).send(html);
          })
          .catch(next);
        return;
      }
    }

    return next();
  });

  app.use(
    helmet({
      // As imagens enviadas são carregadas pelo front, que está em outra origem.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.enableCors({ origin: config.corsOrigins, credentials: true });

  app.setGlobalPrefix('api');
  app.useStaticAssets(config.uploads.dir, {
    prefix: config.uploads.publicPath,
    maxAge: '7d',
    index: false,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // descarta campos não declarados no DTO
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  await app.listen(config.port);
  new Logger('Bootstrap').log(
    `API pronta em http://localhost:${config.port}/api`,
  );
}
void bootstrap();
