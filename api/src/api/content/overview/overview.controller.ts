import { Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminAuth } from 'src/common/decorators/adminAuth.decorator';
import { PaginationQueryDto } from 'src/common/dto/query.dto';
import { AuditEntity } from 'src/common/interceptors/audit.interceptor';
import { ContentOverviewService } from './overview.service';

class AuditQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsString()
    @MaxLength(40)
    entity?: string;

    @IsOptional()
    @IsString()
    @MaxLength(64)
    entityId?: string;
}

@Controller('admin')
@AdminAuth()
@AuditEntity('content')
export class ContentOverviewController {
    constructor(private readonly overview: ContentOverviewService) {}

    @Get('stats')
    stats() {
        return this.overview.stats();
    }

    @Get('translations/report')
    report() {
        return this.overview.translationsReport();
    }

    @Get('audit')
    audit(@Query() q: AuditQueryDto) {
        return this.overview.audit(q);
    }

    @Post('revalidate/all')
    @HttpCode(HttpStatus.OK)
    revalidateAll() {
        return this.overview.revalidateAll();
    }
}
