import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  // CORS — allow any localhost origin (dev) + configured FRONTEND_URL (prod)
  const allowedOrigins = new Set([
    process.env.FRONTEND_URL ?? 'http://localhost:4200',
  ]);
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      // Allow any localhost / 127.0.0.1 port for local development
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      if (allowedOrigins.has(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global prefix so all routes sit under /api/v1
  app.setGlobalPrefix('api/v1');

  await app.listen(process.env.PORT ?? 3000);
  console.log(`API running on http://localhost:${process.env.PORT ?? 3000}/api/v1`);
}
bootstrap();
