import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  app.enableCors({ origin: '*' });

  // Global prefix so all routes sit under /api/v1
  // Exclude /health so Railway's healthcheck works without the prefix
  app.setGlobalPrefix('api/v1', { exclude: ['/health'] });

  await app.listen(process.env.PORT ?? 3000);
  console.log(
    `API running on http://localhost:${process.env.PORT ?? 3000}/api/v1`,
  );
}
bootstrap();
