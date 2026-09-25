import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp, createExpressAdapter } from './app.setup';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, createExpressAdapter());
    configureApp(app);
    app.enableShutdownHooks();
    await app.listen(Number(process.env.SERVER_PORT ?? 3100), '0.0.0.0');
}

void bootstrap();
