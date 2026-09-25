import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { BaseLoggerService } from '../logger/logger.service';
import { PrismaService } from '../prisma/prisma.service';

export type AuditEntry = {
    action: string;
    entity: string;
    entityId?: string | null;
    adminId?: string | null;
    deviceName?: string | null;
    ip?: string | null;
    diff?: unknown;
};

const SENSITIVE_KEY = /pass(word)?|secret|token|code|hash|otp|totp|cookie|authorization/i;

/** Deep copy with sensitive values replaced by "[redacted]". */
export function redact(value: unknown, depth = 0): unknown {
    if (depth > 6 || value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = SENSITIVE_KEY.test(k) ? '[redacted]' : redact(v, depth + 1);
    }
    return out;
}

/**
 * Append-only admin audit trail (brief §6: every admin mutation). Fire-and-forget
 * like Examination's AuditService: a failed audit write is logged, never
 * surfaced to the caller.
 */
@Injectable()
export class AuditService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly logger: BaseLoggerService,
    ) {
        this.logger.setContext(AuditService.name);
    }

    log(entry: AuditEntry): void {
        void this.write(entry);
    }

    async write(entry: AuditEntry): Promise<void> {
        try {
            await this.prisma.auditLog.create({
                data: {
                    action: entry.action,
                    entity: entry.entity,
                    entityId: entry.entityId ?? null,
                    adminId: entry.adminId ?? null,
                    deviceName: entry.deviceName ?? null,
                    ip: entry.ip ?? null,
                    diff: entry.diff === undefined ? undefined : (redact(entry.diff) as Prisma.InputJsonValue),
                },
            });
        } catch (err) {
            this.logger.error(`Audit write failed for ${entry.action}: ${(err as Error).message}`);
        }
    }
}
