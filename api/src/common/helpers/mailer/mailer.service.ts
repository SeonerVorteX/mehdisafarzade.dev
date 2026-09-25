import { Injectable } from '@nestjs/common';
import { MailerService as BaseMailerService } from '@nestjs-modules/mailer';
import { MAIL } from '../../constants/env';
import type { AppLocale } from '../../constants/locales';
import { BaseLoggerService } from '../logger/logger.service';

export type SendTemplateOptions = {
    to: string;
    subject: string;
    template: string;
    locale: AppLocale;
    context: Record<string, unknown>;
    replyTo?: string;
};

/** Thin wrapper that never throws: callers (RMQ consumers) decide on retry from the boolean. */
@Injectable()
export class MailerService {
    constructor(
        private readonly base: BaseMailerService,
        private readonly logger: BaseLoggerService,
    ) {
        this.logger.setContext(MailerService.name);
    }

    get configured(): boolean {
        return MAIL.configured;
    }

    async sendTemplate(opts: SendTemplateOptions): Promise<boolean> {
        try {
            await this.base.sendMail({
                to: opts.to,
                replyTo: opts.replyTo,
                // Header injection guard: visitor-supplied values never carry CR/LF into headers.
                subject: opts.subject.replace(/[\r\n]+/g, ' ').slice(0, 200),
                template: opts.template,
                context: { ...opts.context, locale: opts.locale },
            });
            // Never log the recipient's message; the template name and domain are enough.
            this.logger.debug(`Mail "${opts.template}" sent to *@${opts.to.split('@')[1] ?? '?'}`);
            return true;
        } catch (err) {
            this.logger.error(`Mail "${opts.template}" failed: ${(err as Error).message}`);
            return false;
        }
    }
}
