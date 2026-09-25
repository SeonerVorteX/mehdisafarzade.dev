import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AdminJwtStrategy } from 'src/common/strategies/adminJwt.strategy';
import { AdminLockoutService } from './adminLockout.service';
import { AdminAuthController } from './auth.controller';
import { AdminAuthService } from './auth.service';
import { GoogleAuthService } from './google.service';
import { SessionService } from './session.service';
import { TotpService } from './totp.service';

@Module({
    // Secrets are passed per sign/verify call (access vs pending tokens use different keys).
    imports: [PassportModule, JwtModule.register({})],
    controllers: [AdminAuthController],
    providers: [
        AdminAuthService,
        SessionService,
        TotpService,
        AdminLockoutService,
        GoogleAuthService,
        AdminJwtStrategy,
    ],
    exports: [SessionService],
})
export class AdminAuthModule {}
