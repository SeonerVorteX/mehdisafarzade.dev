import { VersioningType, type INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { AppValidationPipe } from './common/pipes/appValidation.pipe';
import { CORS_ORIGINS, IS_PRODUCTION, RABBITMQ_URL } from './common/constants/env';
import { EVENTS_DLX, EVENTS_EXCHANGE, EVENTS_EXCHANGE_TYPE, EVENTS_QUEUE } from './common/constants/rabbitmq';
import { ResponseExceptionFilter } from './common/filters/responseException.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { requestLogger } from './common/utils/logger.util';

/**
 * The Express instance must be created with routing settings already applied:
 * Express builds its router with the settings it has at that moment, and a later
 * `app.set('case sensitive routing', true)` is silently ignored (the e2e test
 * `GET /V1/Health → 404` caught exactly that). Case-sensitive routing matters
 * because Express otherwise matches `/V1/Admin/...`, which would slip past a
 * case-sensitive nginx rule on the public API vhost (PLAN §15 R2).
 */
export function createExpressAdapter(): ExpressAdapter {
    const instance = express();
    instance.set('case sensitive routing', true);
    instance.set('strict routing', false);
    instance.disable('x-powered-by');
    // The API sits behind exactly one proxy hop in production (nginx on loopback).
    // Client IPs come from X-Real-IP via getClientIp(), never from req.ip.
    instance.set('trust proxy', false);
    return new ExpressAdapter(instance);
}

/**
 * Global HTTP wiring shared by `main.ts` and every e2e test, so tests exercise
 * exactly what production runs. Examination wires the same pieces imperatively
 * in `main.ts` (validation pipe, envelope interceptor + filter, cookie-parser,
 * CORS allowlist); differences are commented inline.
 */
export function configureApp<T extends INestApplication>(app: T): T {
    // Unlike Examination: /v1 in every environment (Examination only outside production).
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

    // JSON APIs only; no HTML is served, so a strict default-src 'none' CSP is safe.
    app.use(
        helmet({
            contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
            crossOriginResourcePolicy: { policy: 'same-site' },
        }),
    );
    // Examination allows 50 MB bodies (its AUDIT S8). Uploads here go straight to S3 via presigned PUT.
    const adapter = app as unknown as { useBodyParser: (type: string, opts: { limit: string }) => void };
    adapter.useBodyParser('json', { limit: '1mb' });
    adapter.useBodyParser('urlencoded', { limit: '100kb' });
    app.use(cookieParser());
    app.use(requestLogger);

    app.useGlobalPipes(
        new AppValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            forbidUnknownValues: true,
            transform: true,
            enableDebugMessages: !IS_PRODUCTION,
        }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
    app.useGlobalFilters(new ResponseExceptionFilter());

    // Only the public site calls the API cross-origin. The admin app is same-origin
    // (admin.* → nginx → /v1/admin/*), so its origin is deliberately absent here.
    app.enableCors({
        origin: CORS_ORIGINS,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Accept', 'X-Locale'],
        maxAge: 600,
    });
    return app;
}

/**
 * The RabbitMQ consumer options (topic exchange, manual ack, DLX). Shared by main.ts
 * and the content e2e test, which attaches the same consumer to its test app.
 */
export function rmqConsumerOptions(): MicroserviceOptions {
    return {
        transport: Transport.RMQ,
        options: {
            urls: [RABBITMQ_URL],
            queue: EVENTS_QUEUE,
            exchange: EVENTS_EXCHANGE,
            exchangeType: EVENTS_EXCHANGE_TYPE,
            wildcards: true,
            noAck: false,
            prefetchCount: 8,
            queueOptions: { durable: true, arguments: { 'x-dead-letter-exchange': EVENTS_DLX } },
        },
    };
}

/** The OpenAPI document (routes + params). Served at /v1/docs outside production; snapshotted by test/contract.e2e-spec.ts. */
export function buildOpenApi(app: INestApplication): OpenAPIObject {
    const config = new DocumentBuilder()
        .setTitle('mehdisafarzade.dev API')
        .setVersion('1')
        .addCookieAuth('__Host-pf_at')
        .build();
    return SwaggerModule.createDocument(app, config);
}

export function setupDocs(app: INestApplication): void {
    if (IS_PRODUCTION) return;
    SwaggerModule.setup('v1/docs', app, () => buildOpenApi(app));
}
