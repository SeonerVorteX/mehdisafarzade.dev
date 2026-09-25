import 'winston-daily-rotate-file';
import { createLogger, format, transports, type Logger } from 'winston';
import type { NextFunction, Request, Response } from 'express';
import { IS_PRODUCTION, IS_TEST, LOG_DIR, LOG_LEVEL } from '../constants/env';

const { combine, timestamp, printf, colorize, errors, json } = format;

const str = (v: unknown): string => (typeof v === 'string' ? v : v === undefined ? '' : JSON.stringify(v));

const line = printf((info) => {
    const ctx = info.context ? ` [${str(info.context)}]` : '';
    const stack = info.stack ? `\n${str(info.stack)}` : '';
    return `[${str(info.timestamp)}] ${info.level}${ctx}: ${str(info.message)}${stack}`;
});

/**
 * Winston + daily rotation, like Examination's `logger.util.ts`, with two changes:
 * a single leveled file stream per day (not one file per level), and JSON lines in
 * production so they can be grepped/parsed. Tests log warnings and above only.
 */
export const winstonLogger: Logger = createLogger({
    level: IS_TEST ? 'warn' : LOG_LEVEL,
    format: combine(errors({ stack: true }), timestamp()),
    transports: [
        new transports.Console({
            format: IS_PRODUCTION ? json() : combine(colorize(), line),
        }),
        ...(IS_TEST
            ? []
            : [
                  new transports.DailyRotateFile({
                      dirname: LOG_DIR,
                      filename: '%DATE%.log',
                      maxFiles: '14d',
                      format: json(),
                  }),
              ]),
    ],
    exitOnError: false,
});

/**
 * Logs method, path (never the query string: OAuth callbacks and signed links carry
 * codes and tokens there), status and duration. Bodies are never logged (brief §6).
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    const started = process.hrtime.bigint();
    res.on('finish', () => {
        const ms = Number(process.hrtime.bigint() - started) / 1e6;
        const path = req.originalUrl.split('?')[0];
        winstonLogger.info(`${req.method} ${path} ${res.statusCode} ${ms.toFixed(1)}ms`, { context: 'HTTP' });
    });
    next();
}
