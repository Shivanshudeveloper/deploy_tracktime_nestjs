import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Global Validation Pipe with custom exception messages
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors.map(
          (error) =>
            `${error.property} has wrong value ${error.value}, ${Object.values(error?.constraints).join(', ')}`
        );
        return new BadRequestException(messages);
      },
    }),
  );

  // Serve static files from the "images" directory
  app.useStaticAssets(join(__dirname, '..', 'images'), {
    prefix: '/images/', // This serves files at /images/*
  });

  // Enable CORS for cross-origin requests
  app.enableCors();

  // Start the application on port 8000
  await app.listen(8000);
}

bootstrap();
