import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

@Controller('health')
export class HealthController {
    @Get()
    @HttpCode(HttpStatus.OK)
    check() {
        return { status: 'ok' as const, timestamp: new Date().toISOString() };
    }
}
