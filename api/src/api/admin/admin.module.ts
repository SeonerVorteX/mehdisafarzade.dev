import { Module } from '@nestjs/common';
import { AdminAuthModule } from './auth/auth.module';

/** Separate admin realm (brief §6). Every route lives under /v1/admin and carries an admin realm decorator. */
@Module({
    imports: [AdminAuthModule],
})
export class AdminModule {}
