import { Injectable, Scope, type LoggerService } from '@nestjs/common';
import { winstonLogger } from '../../utils/logger.util';

/**
 * Context-aware logger (Examination's BaseLoggerService). Transient so each
 * consumer's `setContext` doesn't leak into another's.
 */
@Injectable({ scope: Scope.TRANSIENT })
export class BaseLoggerService implements LoggerService {
    private context?: string;

    setContext(context: string) {
        this.context = context;
    }

    log(message: string) {
        winstonLogger.info(message, { context: this.context });
    }

    error(message: string, trace?: string) {
        winstonLogger.error(message, { context: this.context, stack: trace });
    }

    warn(message: string) {
        winstonLogger.warn(message, { context: this.context });
    }

    debug(message: string) {
        winstonLogger.debug(message, { context: this.context });
    }

    verbose(message: string) {
        winstonLogger.verbose(message, { context: this.context });
    }
}
