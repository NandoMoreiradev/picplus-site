import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { assertConfig, config } from './config/configuration';

async function bootstrap() {
  assertConfig();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Atrás de proxy (Render, Railway, Nginx...) o IP real vem de X-Forwarded-For; necessário ao rate limit.
  if (config.isProduction) app.set('trust proxy', 1);

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
