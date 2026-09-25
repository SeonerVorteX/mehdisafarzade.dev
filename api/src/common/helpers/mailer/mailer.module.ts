import * as path from 'node:path';
import { Global, Module } from '@nestjs/common';
import { MailerModule as BaseMailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { I18nService } from 'nestjs-i18n';
import { MAIL } from '../../constants/env';
import { resolveLocale } from '../../constants/locales';
import { MailerService } from './mailer.service';

/**
 * Nodemailer + Handlebars, configured like Examination's MailerModule. Production
 * uses the SES SMTP interface (MAIL_HOST=email-smtp.<region>.amazonaws.com);
 * dev uses Mailpit (portfolio-mailpit-dev, UI on http://localhost:8026).
 * Templates live in ./templates/<name>.hbs and call `{{t "ns.KEY" lang=locale}}`.
 */
@Global()
@Module({
    imports: [
        BaseMailerModule.forRootAsync({
            inject: [I18nService],
            useFactory: (i18n: I18nService) => ({
                transport: MAIL.configured
                    ? {
                          host: MAIL.host,
                          port: MAIL.port,
                          secure: MAIL.secure,
                          auth: MAIL.user ? { user: MAIL.user, pass: MAIL.pass } : undefined,
                      }
                    : { jsonTransport: true },
                defaults: { from: MAIL.from },
                template: {
                    dir: path.join(__dirname, 'templates'),
                    adapter: new HandlebarsAdapter(
                        {
                            eq: (a: unknown, b: unknown) => a === b,
                            t: (key: string, options: { hash: Record<string, unknown> }) => {
                                const { lang, ...args } = options.hash;
                                return i18n.translate(key, { lang: resolveLocale(lang), args });
                            },
                        },
                        { inlineCssEnabled: false },
                    ),
                    options: { strict: true },
                },
            }),
        }),
    ],
    providers: [MailerService],
    exports: [MailerService],
})
export class MailerModule {}
