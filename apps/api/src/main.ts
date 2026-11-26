import 'dotenv/config';
import { StandardSchemaValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  // rawBody: later we need the raw bytes to verify the WhatsApp webhook signature
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Without this pipe, @Body({ schema }) is silently ignored
  app.useGlobalPipes(new StandardSchemaValidationPipe());

  // Only the web UI (port 55103) may call the API from a browser
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:55103' });

  const doc = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('RevenueAI API').build());
  SwaggerModule.setup('docs', app, doc);

  await app.listen(process.env.PORT ?? 55102);
}
await bootstrap();